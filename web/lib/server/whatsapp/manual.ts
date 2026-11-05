import 'server-only';
import { Types } from 'mongoose';
import { T, fmtMid } from '@/lib/whatsapp/copy';
import { templatePayload, windowOpen } from '@/lib/whatsapp/cloud';
import { hasNumber } from '@/lib/whatsapp/calendar-model';
import { toMin } from '@/lib/whatsapp/slots';
import { sastToUtc } from '../time';
import { connectDB } from '../db';
import { WaAppointment, WaBusiness, WaClient, WaSlotLock } from '../models';
import { bufferFor, grainsOf, isDuplicate, key, loadBusy, staffRanges, type Data, type Service } from './calendar';
import { env } from '../env';
import { sendOut, sendRaw } from './send';

type Id = Types.ObjectId;
export type ManualFail = { ok: false; error: string; code: 'taken' | 'gone' | 'invalid' };
export type ManualOk = { ok: true; id: string };

const fail = (code: ManualFail['code'], error: string): ManualFail => ({ ok: false, code, error });

/** Does the whole service fit inside this person's working time (hours, breaks, time off, holidays) on that date? */
function fitsHours(d: Data, staffId: Id, date: string, time: string, minutes: number): boolean {
  const st = d.staff.find((s) => s.id.equals(staffId));
  if (!st) return false;
  const start = toMin(time);
  return staffRanges(d, st, date).some((r) => start >= toMin(r.start) && start + minutes <= toMin(r.end));
}

/**
 * Takes the 15-minute locks for a booking. Normally one clash means someone else holds the time, so everything taken so far is
 * given back. When the owner has ticked "book it anyway", the clashing rows are skipped and the rest are taken: the unique
 * index still stops two bookings sharing a row, so only a person who chose to overlap ever does.
 */
async function takeLocks(staffId: Id, apptId: Id, startsAt: Date, blocksUntil: Date, force: boolean, already = new Set<string>()): Promise<boolean> {
  const rows = grainsOf(staffId, startsAt, blocksUntil).filter((g) => !already.has(key(g))).map((g) => ({ ...g, apptId }));
  try {
    await WaSlotLock.insertMany(rows, { ordered: !force });
    return true;
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    if (force) return true;
    // Give back only what this attempt took, never rows the booking already held.
    const mine = await WaSlotLock.find({ apptId }).lean();
    await WaSlotLock.deleteMany({ _id: { $in: mine.filter((l) => !already.has(key({ staffId: l.staffId as Id, grain: l.grain }))).map((l) => l._id) } });
    return false;
  }
}

/** Adds a booking the owner typed in. No WhatsApp number is needed. */
export async function addManualBooking(d: Data, o: { name: string; service: Service; date: string; time: string; staffId: string; force: boolean; by: string; now: Date }): Promise<ManualOk | ManualFail> {
  const staffId = new Types.ObjectId(o.staffId);
  if (!d.staff.some((s) => s.id.equals(staffId))) return fail('invalid', 'That person no longer works here.');
  const startsAt = sastToUtc(o.date, o.time);
  if (startsAt.getTime() < o.now.getTime() - 5 * 60000) return fail('invalid', 'That time has already passed.');
  if (!fitsHours(d, staffId, o.date, o.time, o.service.minutes)) return fail('invalid', 'That time is outside their working hours.');
  const endsAt = new Date(startsAt.getTime() + o.service.minutes * 60000);
  const blocksUntil = new Date(endsAt.getTime() + bufferFor(d, o.service) * 60000);
  const apptId = new Types.ObjectId();
  if (!(await takeLocks(staffId, apptId, startsAt, blocksUntil, o.force))) return fail('taken', 'That time was just taken.');
  const st = d.staff.find((s) => s.id.equals(staffId))!;
  try {
    await connectDB();
    // A client typed in by hand may have no number yet, so they get a stand-in that can never be messaged.
    const phone = `m${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const client = await WaClient.create({ business: d.biz.slug, phone, name: o.name, nameConfirmed: true });
    await WaAppointment.create({
      _id: apptId, business: d.biz.slug, serviceId: o.service.id, staffId, clientId: client._id, serviceName: o.service.name, staffName: st.name, clientName: o.name, clientPhone: phone,
      date: o.date, time: o.time, startsAt, endsAt, blocksUntil, priceCents: o.service.priceCents, status: 'booked', source: 'manual', createdBy: o.by, confirmedAt: o.now,
    });
  } catch (e) {
    await WaSlotLock.deleteMany({ apptId });
    throw e;
  }
  return { ok: true, id: String(apptId) };
}

/** Moves a booking to another day, time or person. `force` is the owner's explicit "book it anyway". */
export async function moveBooking(d: Data, o: { apptId: string; date: string; time: string; staffId: string; force: boolean; by: string; now: Date }): Promise<ManualOk | ManualFail> {
  const appt = await WaAppointment.findOne({ _id: o.apptId, business: d.biz.slug, status: 'booked' });
  const svc = appt && d.services.find((s) => s.id.equals(appt.serviceId as Id));
  if (!appt) return fail('gone', 'That booking no longer exists.');
  const minutes = Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000);
  const staffId = new Types.ObjectId(o.staffId);
  if (!d.staff.some((s) => s.id.equals(staffId))) return fail('invalid', 'That person no longer works here.');
  if (sastToUtc(o.date, o.time).getTime() < o.now.getTime() - 5 * 60000) return fail('invalid', 'That time has already passed.');
  if (!fitsHours(d, staffId, o.date, o.time, minutes)) return fail('invalid', 'That time is outside their working hours.');
  const startsAt = sastToUtc(o.date, o.time);
  const endsAt = new Date(startsAt.getTime() + minutes * 60000);
  const buffer = Math.round((appt.blocksUntil.getTime() - appt.endsAt.getTime()) / 60000);
  const blocksUntil = new Date(endsAt.getTime() + (svc ? bufferFor(d, svc) : buffer) * 60000);
  const oldLocks = await WaSlotLock.find({ apptId: appt._id }).lean();
  const oldKeys = new Set(oldLocks.map((l) => key({ staffId: l.staffId as Id, grain: l.grain })));
  const wanted = grainsOf(staffId, startsAt, blocksUntil);
  const wantedKeys = new Set(wanted.map(key));
  if (!(await takeLocks(staffId, appt._id as Id, startsAt, blocksUntil, o.force, oldKeys))) return fail('taken', 'That time was just taken.');
  await WaSlotLock.deleteMany({ _id: { $in: oldLocks.filter((l) => !wantedKeys.has(key({ staffId: l.staffId as Id, grain: l.grain }))).map((l) => l._id) } });
  const st = d.staff.find((s) => s.id.equals(staffId))!;
  await WaAppointment.updateOne({ _id: appt._id }, { $set: { staffId, staffName: st.name, date: o.date, time: o.time, startsAt, endsAt, blocksUntil, reminders: [], reminderFailedAt: null, confirmedAt: o.now, movedBy: o.by } });
  return { ok: true, id: String(appt._id) };
}

/** Cancels a booking and frees its time. */
export async function cancelBooking(slug: string, apptId: string): Promise<ManualOk | ManualFail> {
  const appt = await WaAppointment.findOne({ _id: apptId, business: slug, status: 'booked' });
  if (!appt) return fail('gone', 'That booking no longer exists.');
  await WaAppointment.updateOne({ _id: appt._id }, { $set: { status: 'cancelled', cancelledAt: new Date() } });
  await WaSlotLock.deleteMany({ apptId: appt._id });
  return { ok: true, id: apptId };
}

/** Undo for a cancel: the booking comes back if its time is still free. */
export async function restoreBooking(d: Data, apptId: string): Promise<ManualOk | ManualFail> {
  const appt = await WaAppointment.findOne({ _id: apptId, business: d.biz.slug, status: 'cancelled' });
  if (!appt) return fail('gone', 'That booking can’t be brought back.');
  if (!(await takeLocks(appt.staffId as Id, appt._id as Id, appt.startsAt, appt.blocksUntil, false))) return fail('taken', 'That time was taken in the meantime.');
  await WaAppointment.updateOne({ _id: appt._id }, { $set: { status: 'booked', cancelledAt: null } });
  return { ok: true, id: apptId };
}

/**
 * Tells a client about a change by WhatsApp. Free-form messages are only allowed inside the 24-hour window after their last
 * message. Outside it, a booking the owner added or moved can still be told by the approved "booking made by the salon"
 * template (`WHATSAPP_SALON_TEMPLATE`); anything else isn't sent, and the owner is told. Returns what happened, for the toast.
 */
export async function notifyClient(slug: string, clientId: string, text: string, now: Date, tpl?: { id: string }): Promise<'sent' | 'no-number' | 'window-closed' | 'not-connected' | 'failed'> {
  const [biz, client] = await Promise.all([WaBusiness.findOne({ slug }, { phoneNumberId: 1 }).lean(), WaClient.findById(clientId).lean()]);
  if (!client || !hasNumber(client.phone) || client.optedOut) return 'no-number';
  if (!biz?.phoneNumberId) return 'not-connected';
  if (!windowOpen(client.lastInboundAt, now)) {
    if (!tpl || !env.WHATSAPP_SALON_TEMPLATE || !Types.ObjectId.isValid(tpl.id)) return 'window-closed';
    const a = await WaAppointment.findOne({ _id: tpl.id, clientId: client._id, status: 'booked' }).lean();
    if (!a) return 'failed';
    const first = (client.name || '').split(' ')[0] || 'there';
    return (await sendRaw(biz.phoneNumberId, templatePayload(client.phone, env.WHATSAPP_SALON_TEMPLATE, env.WHATSAPP_TEMPLATE_LANG, [first, a.serviceName ?? '', fmtMid(a.date), a.time], [`remind:ok:${tpl.id}`, `remind:move:${tpl.id}`]))) ? 'sent' : 'failed';
  }
  return (await sendOut(biz.phoneNumberId, client.phone, [{ type: 'text', body: text }])) ? 'sent' : 'failed';
}

export const salonMessages = { moved: T.movedBySalon, cancelled: T.cancelledBySalon };
export { loadBusy };
