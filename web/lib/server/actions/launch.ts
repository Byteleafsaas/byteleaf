'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { applyPageEdit } from '@/lib/launch/edit';
import { changeList, discard, publish, undoPublish } from '@/lib/launch/engine';
import { addPhoto, movePhoto, removePhoto, removeService, reorderServices, updatePhoto, upsertService } from '@/lib/launch/ops';
import { settingsProblems } from '@/lib/launch/rules';
import { PAGES, type PageKey, type Settings } from '@/lib/launch/types';
import { SITE_SLUG } from '@/lib/launch/defaults';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { mutate } from '../launch/store';
import { SiteEnquiry } from '../models';

type Fail = { ok: false; error: string };
const refresh = () => { revalidatePath('/admin/website', 'layout'); revalidatePath('/projects/launch-website', 'layout'); };
const id = z.string().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/);
const IMAGE_KEY = /^projects\/[a-f0-9-]{36}\.(jpg|png|webp)$/;

/** Saves a page's blocks as a draft. Customers see nothing until Publish. */
export async function savePageAction(page: string, edits: unknown): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  if (!PAGES.includes(page as PageKey)) return { ok: false, error: 'That page doesn’t exist.' };
  const r = await mutate((s) => {
    const edit = applyPageEdit(s.saved.pages[page as PageKey], edits, s.saved.photos.map((p) => p.id));
    return edit.ok ? { state: { ...s, saved: { ...s.saved, pages: { ...s.saved.pages, [page]: edit.blocks } } }, result: null } : { error: edit.error };
  });
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

const serviceSchema = z.object({
  id: id.optional(),
  name: z.string().max(80),
  price: z.number().int().min(0).max(1_000_000).nullable(),
  time: z.string().max(40),
  summary: z.string().max(160).optional(),
  included: z.array(z.string().max(80)).max(10),
  visible: z.boolean(),
});

export async function saveServiceAction(input: z.input<typeof serviceSchema>): Promise<{ ok: true; id: string } | Fail> {
  await assertAdmin();
  const p = serviceSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Enter a price in whole rands, or tick “No fixed price”.' };
  const r = await mutate<string>((s) => {
    const u = upsertService(s.saved, p.data);
    return u.ok ? { state: { ...s, saved: u.snapshot }, result: u.id } : { error: u.error };
  });
  refresh();
  return r.ok ? { ok: true, id: r.result } : { ok: false, error: r.error };
}

export async function toggleServiceAction(serviceId: string, visible: boolean): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  if (!id.safeParse(serviceId).success) return { ok: false, error: 'That service no longer exists.' };
  const r = await mutate((s) => {
    const cur = s.saved.services.find((x) => x.id === serviceId);
    if (!cur) return { error: 'That service no longer exists.' };
    return { state: { ...s, saved: { ...s.saved, services: s.saved.services.map((x) => (x.id === serviceId ? { ...x, visible } : x)) } }, result: null };
  });
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function reorderServicesAction(ids: string[]): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  const r = await mutate((s) => {
    const next = reorderServices(s.saved, ids);
    return next ? { state: { ...s, saved: next }, result: null } : { error: 'That order could not be saved.' };
  });
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function deleteServiceAction(serviceId: string): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  const r = await mutate((s) => {
    const next = removeService(s.saved, serviceId);
    return next ? { state: { ...s, saved: next }, result: null } : { error: 'That service no longer exists.' };
  });
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

const settingsSchema = z.object({
  name: z.string().max(80), description: z.string().max(200), phone: z.string().max(40), whatsapp: z.string().max(40), whatsappSame: z.boolean(), email: z.string().max(120),
  areas: z.array(z.string().max(60)).max(20), hours: z.object({ weekdays: z.string().max(40), saturday: z.string().max(40), sunday: z.string().max(40) }), instagram: z.string().max(200), facebook: z.string().max(200),
});

export async function saveSettingsAction(input: z.input<typeof settingsSchema>): Promise<{ ok: true } | { ok: false; error: string; errors?: Record<string, string> }> {
  await assertAdmin();
  const p = settingsSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Those details could not be read.' };
  const clean: Settings = { ...p.data, name: p.data.name.trim(), description: p.data.description.trim(), phone: p.data.phone.trim(), whatsapp: p.data.whatsapp.trim(), email: p.data.email.trim(), areas: p.data.areas.map((a) => a.trim()), instagram: p.data.instagram.trim(), facebook: p.data.facebook.trim() };
  const errors = settingsProblems(clean);
  if (Object.keys(errors).length) return { ok: false, error: `${Object.keys(errors).length} thing${Object.keys(errors).length === 1 ? '' : 's'} to fix before this can be saved.`, errors };
  const r = await mutate((s) => ({ state: { ...s, saved: { ...s.saved, settings: clean } }, result: null }));
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

const patchSchema = z.object({ alt: z.string().max(200).optional(), on: z.object({ home: z.boolean().optional(), about: z.boolean().optional(), gallery: z.boolean().optional() }).optional() });

/** Registers a photo that was just uploaded (the file itself is stored by the upload route). */
export async function addPhotoAction(input: { key: string; w: number; alt?: string }): Promise<{ ok: true; id: string } | Fail> {
  await assertAdmin();
  if (!IMAGE_KEY.test(input.key) || !Number.isFinite(input.w)) return { ok: false, error: 'That photo could not be added.' };
  const r = await mutate<string>((s) => { const a = addPhoto(s.saved, { key: input.key, w: Math.round(input.w), alt: (input.alt ?? '').slice(0, 200) }); return { state: { ...s, saved: a.snapshot }, result: a.id }; });
  refresh();
  return r.ok ? { ok: true, id: r.result } : { ok: false, error: r.error };
}

export async function updatePhotoAction(photoId: string, patch: z.input<typeof patchSchema>): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  const p = patchSchema.safeParse(patch);
  if (!p.success || !id.safeParse(photoId).success) return { ok: false, error: 'That change could not be saved.' };
  const r = await mutate((s) => { const next = updatePhoto(s.saved, photoId, p.data); return next ? { state: { ...s, saved: next }, result: null } : { error: 'That photo no longer exists.' }; });
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function movePhotoAction(photoId: string, dir: -1 | 1): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  const r = await mutate((s) => { const next = movePhoto(s.saved, photoId, dir === -1 ? -1 : 1); return next ? { state: { ...s, saved: next }, result: null } : { error: 'That photo can’t move that way.' }; });
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function removePhotoAction(photoId: string): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  const r = await mutate((s) => { const next = removePhoto(s.saved, photoId); return next ? { state: { ...s, saved: next }, result: null } : { error: 'That photo no longer exists.' }; });
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/** Makes everything saved live, in one write. Returns the new version so Undo can only undo this publish. */
export async function publishAction(): Promise<{ ok: true; version: number } | Fail> {
  await assertAdmin();
  const r = await mutate<number>((s) => {
    if (!changeList(s.live, s.saved).length) return { error: 'There is nothing to publish.' };
    const next = publish(s);
    return { state: next, result: next.liveVersion };
  });
  refresh();
  return r.ok ? { ok: true, version: r.result } : { ok: false, error: r.error };
}

/** Undo for ten seconds after publishing: the previous live version comes back and the changes return to the publish bar. */
export async function undoPublishAction(version: number): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  const r = await mutate((s) => { const next = undoPublish(s, version); return next ? { state: next, result: null } : { error: 'Undo is no longer possible: something was published since.' }; });
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/** Throws away every saved edit. The live site stays exactly as it is. */
export async function discardAction(): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  const r = await mutate((s) => ({ state: discard(s), result: null }));
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/** Marks a website enquiry as read or archived. */
export async function setEnquiryStatusAction(enquiryId: string, status: 'new' | 'read' | 'archived'): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  if (!/^[a-f0-9]{24}$/.test(enquiryId) || !['new', 'read', 'archived'].includes(status)) return { ok: false, error: 'That change could not be saved.' };
  await connectDB();
  await SiteEnquiry.updateOne({ _id: enquiryId, site: SITE_SLUG }, { $set: { status } });
  refresh();
  return { ok: true };
}
