'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { IMAGE_KEY } from '../images';
import { toProject } from '../mappers';
import { Project } from '../models';
import { deleteObject } from '../storage';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const idSchema = z.string().regex(/^[a-f0-9]{24}$/);
const imageRef = z.object({ key: z.string().regex(IMAGE_KEY), width: z.number().int().positive(), height: z.number().int().positive(), alt: z.string().trim().max(200).optional() });
const CATS = ['Design', 'Frontend', 'Backend', 'AI'] as const;

const projectSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1, 'Give the project a name.').max(120),
  client: z.string().trim().max(120).default(''),
  type: z.string().trim().max(120).default(''),
  industry: z.string().trim().max(80).default('Other'),
  categories: z.array(z.enum(CATS)).default([]),
  stack: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  summary: z.string().max(140).default(''),
  challenge: z.string().max(2000).default(''),
  whatWeDid: z.string().max(2000).default(''),
  result: z.string().max(2000).default(''),
  live: z.boolean().default(false),
  featured: z.boolean().default(false),
  demoUrl: z.string().trim().max(300).refine((v) => v === '' || /^(\/(?!\/)|https?:\/\/)/.test(v), 'Use a page on this site like /projects/demo, or a full address starting with https://.').default(''),
  cover: imageRef.nullable().default(null),
  gallery: z.array(imageRef).max(8).default([]),
});

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';

async function uniqueSlug(name: string, selfId?: string) {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; await Project.exists({ slug, ...(selfId ? { _id: { $ne: selfId } } : {}) }); n++) slug = `${base}-${n}`;
  return slug;
}

function revalidatePublic() {
  revalidatePath('/admin', 'layout');
  revalidatePath('/projects');
  revalidatePath('/');
}

export async function saveProjectAction(input: z.input<typeof projectSchema>): Promise<Result<{ project: ReturnType<typeof toProject> }>> {
  await assertAdmin();
  const p = projectSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the form and try again.' };
  await connectDB();
  const { id, ...data } = p.data;

  let doc;
  if (id) {
    doc = await Project.findOne({ _id: id, deletedAt: null });
    if (!doc) return { ok: false, error: 'Project not found.' };
    const before = [doc.cover?.key, ...doc.gallery.map((g: { key?: string | null }) => g.key)].filter(Boolean) as string[];
    Object.assign(doc, data, { slug: await uniqueSlug(data.name, id) });
    await doc.save();
    // Images that were removed in the form are deleted from storage (best effort).
    const after = new Set([data.cover?.key, ...data.gallery.map((g) => g.key)]);
    await Promise.all(before.filter((k) => !after.has(k)).map(deleteObject));
  } else {
    const count = await Project.countDocuments();
    doc = await Project.create({ ...data, slug: await uniqueSlug(data.name), pattern: count % 3, sortOrder: count });
  }
  // Exactly one featured project: featuring this one unfeatures the rest.
  if (data.featured) await Project.updateMany({ _id: { $ne: doc._id } }, { $set: { featured: false } });
  revalidatePublic();
  return { ok: true, project: toProject(doc.toObject()) };
}

export async function setProjectLiveAction(id: string, live: boolean): Promise<Result> {
  await assertAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: 'Project not found.' };
  await connectDB();
  await Project.updateOne({ _id: id }, { $set: { live } });
  revalidatePublic();
  return { ok: true };
}

export async function featureProjectAction(id: string): Promise<Result> {
  await assertAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: 'Project not found.' };
  await connectDB();
  await Project.updateMany({}, { $set: { featured: false } });
  await Project.updateOne({ _id: id }, { $set: { featured: true } });
  revalidatePublic();
  return { ok: true };
}

/** Soft delete (deletedAt) so Undo can restore it. TODO(ops): purge rows deleted more than 30 days ago. */
export async function deleteProjectAction(id: string): Promise<Result> {
  await assertAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: 'Project not found.' };
  await connectDB();
  await Project.updateOne({ _id: id }, { $set: { deletedAt: new Date(), featured: false } });
  revalidatePublic();
  return { ok: true };
}

export async function restoreProjectAction(id: string): Promise<Result> {
  await assertAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: 'Project not found.' };
  await connectDB();
  await Project.updateOne({ _id: id }, { $set: { deletedAt: null } });
  revalidatePublic();
  return { ok: true };
}
