'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hoursFromWeek, weekProblem } from '@/lib/whatsapp/hours';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { WaAppointment, WaBusiness, WaService, WaStaff } from '../models';
import { BOOKING_SLUG } from '../whatsapp/admin';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const refresh = () => revalidatePath('/admin/bookings', 'layout');
/** A WhatsApp list holds 10 rows and one is kept for "Ask a person". */
const WA_SERVICE_LIMIT = 9;

const serviceSchema = z.object({
  id: objectId.optional(),
  name: z.string().trim().min(1, 'Give the service a name.').max(24, 'Use 24 characters or fewer so it fits in WhatsApp.'),
  minutes: z.number().int().min(15, 'A service needs to be at least 15 minutes.').max(24 * 60),
  priceRand: z.number().int().min(0, 'Enter a price, or 0 if it’s free.').max(1_000_000),
  bufferMin: z.number().int().min(0).max(120),
  staff: z.array(objectId).min(1, 'Pick at least one person.'),
  onWhatsApp: z.boolean(),
  line: z.string().trim().max(72, 'Use 72 characters or fewer.'),
  hideName: z.boolean(),
});

const onCount = () => WaService.countDocuments({ business: BOOKING_SLUG, active: true, onWhatsApp: true });

export async function saveServiceAction(input: z.input<typeof serviceSchema>): Promise<Result<{ id: string }>> {
  await assertAdmin();
  const p = serviceSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the details and try again.' };
  const d = p.data;
  await connectDB();
  const existing = d.id ? await WaService.findOne({ _id: d.id, business: BOOKING_SLUG, active: true }) : null;
  if (d.id && !existing) return { ok: false, error: 'That service no longer exists.' };
  // A tenth service cannot be switched on for WhatsApp: the list would not fit.
  if (d.onWhatsApp && !existing?.onWhatsApp && (await onCount()) >= WA_SERVICE_LIMIT) return { ok: false, error: 'The WhatsApp list is full. Switch another service off first.' };
  const set = { name: d.name, minutes: d.minutes, priceCents: d.priceRand * 100, bufferMin: d.bufferMin, staff: d.staff, onWhatsApp: d.onWhatsApp, waLine: d.line, hideName: d.hideName };
  if (existing) {
    await WaService.updateOne({ _id: existing._id }, { $set: set });
    refresh();
    return { ok: true, id: String(existing._id) };
  }
  const last = await WaService.findOne({ business: BOOKING_SLUG }).sort({ order: -1 }).lean();
  const made = await WaService.create({ business: BOOKING_SLUG, ...set, active: true, order: (last?.order ?? -1) + 1 });
  refresh();
  return { ok: true, id: String(made._id) };
}

/** Switch a service on or off in the WhatsApp list. Off means it can only be booked by hand from the calendar. */
export async function toggleServiceAction(id: string, on: boolean): Promise<Result> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'That service no longer exists.' };
  await connectDB();
  const s = await WaService.findOne({ _id: id, business: BOOKING_SLUG, active: true });
  if (!s) return { ok: false, error: 'That service no longer exists.' };
  if (on && !s.onWhatsApp && (await onCount()) >= WA_SERVICE_LIMIT) return { ok: false, error: 'The WhatsApp list is full. Switch another service off first.' };
  await WaService.updateOne({ _id: s._id }, { $set: { onWhatsApp: on } });
  refresh();
  return { ok: true };
}

/** The order of the list here is the order clients see in WhatsApp. */
export async function reorderServicesAction(ids: string[]): Promise<Result> {
  await assertAdmin();
  const p = z.array(objectId).max(100).safeParse(ids);
  if (!p.success) return { ok: false, error: 'That order could not be saved.' };
  await connectDB();
  await Promise.all(p.data.map((id, order) => WaService.updateOne({ _id: id, business: BOOKING_SLUG }, { $set: { order } })));
  refresh();
  return { ok: true };
}

/** Removes a service from the list. Bookings already made keep it, because they store its name, length and price. */
export async function deleteServiceAction(id: string): Promise<Result<{ upcoming: number }>> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'That service no longer exists.' };
  await connectDB();
  const upcoming = await WaAppointment.countDocuments({ business: BOOKING_SLUG, serviceId: id, status: 'booked', startsAt: { $gt: new Date() } });
  await WaService.updateOne({ _id: id, business: BOOKING_SLUG }, { $set: { active: false, onWhatsApp: false } });
  refresh();
  return { ok: true, upcoming };
}

/** The "Start from a salon template" button on an empty list. */
export async function addSalonTemplateAction(): Promise<Result> {
  await assertAdmin();
  await connectDB();
  if (await WaService.exists({ business: BOOKING_SLUG, active: true })) return { ok: false, error: 'There are already services here.' };
  const base = [
    ['Knotless braids', 240, 650, 15], ["Kids' braids", 120, 350, 0], ['Silk press', 90, 380, 10], ['Gel nails', 60, 280, 10], ['Consultation', 15, 0, 0],
  ] as const;
  await WaService.insertMany(base.map(([name, minutes, rand, bufferMin], order) => ({ business: BOOKING_SLUG, name, minutes, priceCents: rand * 100, bufferMin, staff: [], active: true, onWhatsApp: name !== 'Consultation', order })));
  refresh();
  return { ok: true };
}

/* ---------- staff and hours ---------- */

const day = z.object({ open: z.boolean(), a: z.number().int().min(0).max(1439), b: z.number().int().min(0).max(1440), br: z.tuple([z.number().int().min(0).max(1440), z.number().int().min(0).max(1440)]).nullable() });
const week = z.array(day).length(7);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hoursSchema = z.object({
  salon: week,
  staff: z.array(z.object({
    id: objectId,
    same: z.boolean(),
    week,
    offs: z.array(z.object({ a: date, b: date, n: z.string().trim().max(120) })).max(50),
  })).max(50),
  holidayOpen: z.array(date).max(100),
});

/** Saves the salon's hours, each person's week and time off, and which public holidays are open. Bookings already made never move. */
export async function saveHoursAction(input: z.input<typeof hoursSchema>): Promise<Result> {
  await assertAdmin();
  const p = hoursSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Those hours could not be read. Check them and try again.' };
  const d = p.data;
  const problem = [d.salon, ...d.staff.filter((s) => !s.same).map((s) => s.week)].map(weekProblem).find(Boolean);
  if (problem) return { ok: false, error: problem };
  for (const s of d.staff) for (const o of s.offs) if (o.b < o.a) return { ok: false, error: 'The last day off can’t be before the first.' };
  await connectDB();
  const valid = new Set((await WaStaff.find({ business: BOOKING_SLUG, active: true }, { _id: 1 }).lean()).map((s) => String(s._id)));
  await WaBusiness.updateOne({ slug: BOOKING_SLUG }, { $set: { hours: hoursFromWeek(d.salon), holidayOpen: d.holidayOpen } });
  await Promise.all(d.staff.filter((s) => valid.has(s.id)).map((s) => WaStaff.updateOne({ _id: s.id, business: BOOKING_SLUG }, { $set: { hours: s.same ? {} : hoursFromWeek(s.week), daysOff: s.offs.map((o) => ({ from: o.a, to: o.b, note: o.n })) } })));
  refresh();
  return { ok: true };
}
