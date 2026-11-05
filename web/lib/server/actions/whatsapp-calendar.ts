'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { T } from '@/lib/whatsapp/copy';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { WaAppointment } from '../models';
import { BOOKING_SLUG } from '../whatsapp/admin';
import { loadData } from '../whatsapp/calendar';
import { addManualBooking, cancelBooking, moveBooking, notifyClient, restoreBooking } from '../whatsapp/manual';

type Fail = { ok: false; error: string };
/** What happened with the WhatsApp message, in words for the toast. */
type Told = { told: '' | 'sent' | 'no-number' | 'window-closed' | 'not-connected' | 'failed' };
const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/);
const refresh = () => revalidatePath('/admin/bookings', 'layout');

/** The client says they will come: the booking shows as Confirmed. */
export async function confirmBookingAction(id: string): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'That booking no longer exists.' };
  await connectDB();
  const r = await WaAppointment.updateOne({ _id: id, business: BOOKING_SLUG, status: 'booked' }, { $set: { confirmedAt: new Date() } });
  refresh();
  return r.matchedCount ? { ok: true } : { ok: false, error: 'That booking no longer exists.' };
}

/** Marks a booking whose time has passed as a no-show, or undoes it. */
export async function noShowAction(id: string, undo = false): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'That booking no longer exists.' };
  await connectDB();
  const a = await WaAppointment.findOne({ _id: id, business: BOOKING_SLUG, status: undo ? 'no_show' : 'booked' });
  if (!a) return { ok: false, error: 'That booking no longer exists.' };
  if (!undo && a.startsAt.getTime() > Date.now()) return { ok: false, error: 'You can mark a no-show once the start time has passed.' };
  await WaAppointment.updateOne({ _id: a._id }, { $set: undo ? { status: 'booked', noShowAt: null } : { status: 'no_show', noShowAt: new Date() } });
  refresh();
  return { ok: true };
}

/** Asks for the reminder to be sent again at the next scheduler run. */
export async function retryReminderAction(id: string): Promise<{ ok: true } | Fail> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'That booking no longer exists.' };
  await connectDB();
  await WaAppointment.updateOne({ _id: id, business: BOOKING_SLUG }, { $set: { reminderFailedAt: null, reminders: [] } });
  refresh();
  return { ok: true };
}

const pick = z.object({ date, time, staffId: objectId, force: z.boolean() });

export async function moveBookingAction(input: { id: string; date: string; time: string; staffId: string; force: boolean; notify: boolean }): Promise<({ ok: true } & Told) | Fail> {
  const admin = await assertAdmin();
  const p = pick.extend({ id: objectId, notify: z.boolean() }).safeParse(input);
  if (!p.success) return { ok: false, error: 'Those details could not be read.' };
  const d = await loadData(BOOKING_SLUG, { all: true });
  if (!d) return { ok: false, error: 'The business could not be found.' };
  const before = await WaAppointment.findOne({ _id: p.data.id, business: BOOKING_SLUG, status: 'booked' }).lean();
  const r = await moveBooking(d, { apptId: p.data.id, date: p.data.date, time: p.data.time, staffId: p.data.staffId, force: p.data.force, by: admin.name, now: new Date() });
  if (!r.ok) return { ok: false, error: r.error };
  refresh();
  const told = p.data.notify && before ? await notifyClient(BOOKING_SLUG, String(before.clientId), T.movedBySalon(d.biz.name, before.serviceName ?? '', p.data.date, p.data.time), new Date()) : '';
  return { ok: true, told };
}

export async function addBookingAction(input: { name: string; serviceId: string; date: string; time: string; staffId: string; force: boolean }): Promise<{ ok: true; id: string } | Fail> {
  const admin = await assertAdmin();
  const p = pick.extend({ name: z.string().trim().min(1, 'Enter the client’s name.').max(80), serviceId: objectId }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Those details could not be read.' };
  const d = await loadData(BOOKING_SLUG, { all: true });
  const service = d?.services.find((s) => String(s.id) === p.data.serviceId);
  if (!d || !service) return { ok: false, error: 'That service no longer exists.' };
  const r = await addManualBooking(d, { name: p.data.name, service, date: p.data.date, time: p.data.time, staffId: p.data.staffId, force: p.data.force, by: admin.name, now: new Date() });
  if (!r.ok) return { ok: false, error: r.error };
  refresh();
  return { ok: true, id: r.id };
}

export async function cancelBookingAction(id: string, notify: boolean): Promise<({ ok: true } & Told) | Fail> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'That booking no longer exists.' };
  await connectDB();
  const a = await WaAppointment.findOne({ _id: id, business: BOOKING_SLUG, status: 'booked' }).lean();
  const r = await cancelBooking(BOOKING_SLUG, id);
  if (!r.ok) return { ok: false, error: r.error };
  refresh();
  const d = notify && a ? await loadData(BOOKING_SLUG, { all: true }) : null;
  const told = notify && a && d ? await notifyClient(BOOKING_SLUG, String(a.clientId), T.cancelledBySalon(d.biz.name, a.serviceName ?? '', a.date, a.time), new Date()) : '';
  return { ok: true, told };
}

/** Undo for a cancel or an added booking. */
export async function undoAction(kind: 'cancel' | 'add' | 'move', id: string, back?: { date: string; time: string; staffId: string }): Promise<{ ok: true } | Fail> {
  const admin = await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'That booking no longer exists.' };
  const d = await loadData(BOOKING_SLUG, { all: true });
  if (!d) return { ok: false, error: 'The business could not be found.' };
  await connectDB();
  const r = kind === 'cancel' ? await restoreBooking(d, id)
    : kind === 'add' ? await cancelBooking(BOOKING_SLUG, id)
    : back ? await moveBooking(d, { apptId: id, ...back, force: true, by: admin.name, now: new Date(0) }) : { ok: false as const, error: 'Nothing to undo.' };
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}
