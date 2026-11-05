import 'server-only';
import { Types } from 'mongoose';
import { freeStarts, intersect, rangesOn, windowDates, type Busy, type Range, type WeekHours } from '@/lib/whatsapp/slots';
import { closedHolidays } from '@/lib/whatsapp/holidays';
import { sastToUtc, todaySast } from '@/lib/server/time';
import { connectDB } from '../db';
import { WaAppointment, WaBusiness, WaService, WaSlotLock, WaStaff } from '../models';

type Id = Types.ObjectId;
export type Biz = { slug: string; name: string; hours: WeekHours; daysOff: { from: string; to: string }[]; minNoticeMin: number; bufferMin: number; stepMin: number; windowDays: number; cancelWindowHours: number; replyTime: string; payNote: string; address: string; privacyUrl: string; lateFee: string; brand: string; clinic: boolean };
export type Service = { id: Id; name: string; minutes: number; priceCents: number; bufferMin: number | null; staff: Id[]; hideName: boolean };
export type Staff = { id: Id; name: string; hours: WeekHours; daysOff: { from: string; to: string }[] };
export type Data = { biz: Biz; services: Service[]; staff: Staff[] };

const GRAIN = 15 * 60000;
const asHours = (x: unknown): WeekHours => (x && typeof x === 'object' ? (x as WeekHours) : {});

/** Everything the booking engine needs about one business. Services switched off for WhatsApp are left out unless `all` is set (the calendar can still book them by hand). */
export async function loadData(slug: string, opts: { all?: boolean } = {}): Promise<Data | null> {
  await connectDB();
  const b = await WaBusiness.findOne({ slug, active: true }).lean();
  if (!b) return null;
  const [services, staff] = await Promise.all([
    WaService.find({ business: slug, active: true, ...(opts.all ? {} : { onWhatsApp: { $ne: false } }) }).sort({ order: 1 }).lean(),
    WaStaff.find({ business: slug, active: true }).sort({ order: 1 }).lean(),
  ]);
  return {
    biz: { slug, name: b.name, hours: asHours(b.hours), daysOff: [...(b.daysOff ?? []), ...closedHolidays(todaySast(), b.holidayOpen ?? [])], minNoticeMin: b.minNoticeMin, bufferMin: b.bufferMin, stepMin: b.stepMin, windowDays: b.windowDays, cancelWindowHours: b.cancelWindowHours, replyTime: b.replyTime ?? '[time]', payNote: b.payNote, address: b.address ?? '[Salon address]', privacyUrl: b.privacyUrl ?? '[privacy link]', lateFee: b.lateFee ?? 'R [amount]', brand: b.brand ?? 'byteleaf', clinic: Boolean(b.clinic) },
    services: services.map((s) => ({ id: s._id as Id, name: s.name, minutes: s.minutes, priceCents: s.priceCents, bufferMin: s.bufferMin ?? null, staff: (s.staff ?? []) as Id[], hideName: Boolean(s.hideName) })),
    staff: staff.map((s) => ({ id: s._id as Id, name: s.name, hours: asHours(s.hours), daysOff: s.daysOff ?? [] })),
  };
}

/** The ranges a staff member can take bookings on a date: their hours, kept inside the business's opening hours. */
export function staffRanges(d: Data, st: Staff, date: string): Range[] {
  const biz = rangesOn(date, d.biz.hours, d.biz.daysOff);
  if (!biz.length || st.daysOff.some((o) => date >= o.from && date <= o.to)) return [];
  return Object.keys(st.hours).length ? intersect(biz, rangesOn(date, st.hours)) : biz;
}

export const eligibleStaff = (d: Data, svc: Service) => (svc.staff.length ? d.staff.filter((s) => svc.staff.some((x) => x.equals(s.id))) : d.staff);
export const bufferFor = (d: Data, svc: Service) => svc.bufferMin ?? d.biz.bufferMin;

/** Booked time per staff member between two instants, optionally ignoring one booking (when it is being moved). */
export async function loadBusy(slug: string, from: Date, to: Date, exclude?: string): Promise<Map<string, Busy[]>> {
  const rows = await WaAppointment.find({ business: slug, status: 'booked', startsAt: { $lt: to }, blocksUntil: { $gt: from }, ...(exclude ? { _id: { $ne: exclude } } : {}) }, { staffId: 1, startsAt: 1, blocksUntil: 1 }).lean();
  const map = new Map<string, Busy[]>();
  for (const r of rows) {
    const k = String(r.staffId);
    map.set(k, [...(map.get(k) ?? []), { start: r.startsAt, end: r.blocksUntil }]);
  }
  return map;
}

/** Free start times on one date, and which staff members could take each. */
export function timesOn(d: Data, svc: Service, date: string, busy: Map<string, Busy[]>, now: Date): Map<string, Id[]> {
  const out = new Map<string, Id[]>();
  const notBefore = new Date(now.getTime() + d.biz.minNoticeMin * 60000);
  for (const st of eligibleStaff(d, svc)) {
    const starts = freeStarts({ date, ranges: staffRanges(d, st, date), busy: busy.get(String(st.id)) ?? [], durationMin: svc.minutes, bufferMin: bufferFor(d, svc), stepMin: d.biz.stepMin, notBefore });
    for (const t of starts) out.set(t, [...(out.get(t) ?? []), st.id]);
  }
  return out;
}

export async function timesFor(d: Data, svc: Service, date: string, now: Date, exclude?: string): Promise<string[]> {
  const busy = await loadBusy(d.biz.slug, sastToUtc(date, '00:00'), new Date(sastToUtc(date, '00:00').getTime() + 86400000), exclude);
  return [...timesOn(d, svc, date, busy, now).keys()].sort();
}

/** For each start time that exactly one person could take, that person's name. Times where we choose between people are left out. */
export async function staffAtFor(d: Data, svc: Service, date: string, now: Date, exclude?: string): Promise<Record<string, string>> {
  const busy = await loadBusy(d.biz.slug, sastToUtc(date, '00:00'), new Date(sastToUtc(date, '00:00').getTime() + 86400000), exclude);
  const out: Record<string, string> = {};
  for (const [time, ids] of timesOn(d, svc, date, busy, now)) {
    if (ids.length === 1) { const st = d.staff.find((s) => s.id.equals(ids[0])); if (st) out[time] = st.name; }
  }
  return out;
}

/** The next dates with space, soonest first (at most 14). */
export async function daysFor(d: Data, svc: Service, now: Date, exclude?: string): Promise<{ date: string; count: number }[]> {
  const dates = windowDates(now, d.biz.windowDays);
  const busy = await loadBusy(d.biz.slug, now, new Date(sastToUtc(dates[dates.length - 1], '00:00').getTime() + 86400000), exclude);
  const out: { date: string; count: number }[] = [];
  for (const date of dates) {
    const n = timesOn(d, svc, date, busy, now).size;
    if (n) out.push({ date, count: n });
    if (out.length === 14) break;
  }
  return out;
}

export const grainsOf = (staffId: Id, start: Date, until: Date) => {
  const out: { staffId: Id; grain: Date }[] = [];
  for (let g = start.getTime(); g < until.getTime(); g += GRAIN) out.push({ staffId, grain: new Date(g) });
  return out;
};
export const key = (x: { staffId: Id; grain: Date }) => `${x.staffId}|${x.grain.getTime()}`;
export const isDuplicate = (e: unknown) => (e as { code?: number; writeErrors?: unknown })?.code === 11000 || Boolean((e as { writeErrors?: unknown })?.writeErrors);

export type Booked = { id: Id; serviceId: Id; serviceName: string; date: string; time: string; startsAt: Date; endsAt: Date; priceCents: number; staffName: string };

/** Books the slot for the first free staff member (the one with the fewest bookings that day). `taken` if nobody is free. */
export async function bookSlot(d: Data, svc: Service, client: { id: Id; name: string; phone: string }, date: string, time: string, now: Date, source: 'whatsapp' | 'simulator' | 'manual'): Promise<Booked | 'taken'> {
  const startsAt = sastToUtc(date, time);
  const busy = await loadBusy(d.biz.slug, startsAt, new Date(startsAt.getTime() + 86400000));
  const candidates = timesOn(d, svc, date, busy, now).get(time) ?? [];
  if (!candidates.length) return 'taken';
  const load = (id: Id) => (busy.get(String(id)) ?? []).length;
  const ordered = [...candidates].sort((a, b) => load(a) - load(b));

  const endsAt = new Date(startsAt.getTime() + svc.minutes * 60000);
  const blocksUntil = new Date(endsAt.getTime() + bufferFor(d, svc) * 60000);
  for (const staffId of ordered) {
    const apptId = new Types.ObjectId();
    try {
      await WaSlotLock.insertMany(grainsOf(staffId, startsAt, blocksUntil).map((g) => ({ ...g, apptId })), { ordered: true });
    } catch (e) {
      await WaSlotLock.deleteMany({ apptId });
      if (isDuplicate(e)) continue; // someone else took it this instant: try the next person
      throw e;
    }
    const st = d.staff.find((s) => s.id.equals(staffId))!;
    try {
      await WaAppointment.create({
        _id: apptId, business: d.biz.slug, serviceId: svc.id, staffId, clientId: client.id, serviceName: svc.name, staffName: st.name, clientName: client.name, clientPhone: client.phone,
        date, time, startsAt, endsAt, blocksUntil, priceCents: svc.priceCents, status: 'booked', source,
      });
    } catch (e) {
      await WaSlotLock.deleteMany({ apptId });
      throw e;
    }
    return { id: apptId, serviceId: svc.id, serviceName: svc.name, date, time, startsAt, endsAt, priceCents: svc.priceCents, staffName: st.name };
  }
  return 'taken';
}

/** Moves a booking to a new time, keeping the same staff member when they are free. `taken` leaves everything as it was. */
export async function moveSlot(d: Data, apptId: string, date: string, time: string, now: Date): Promise<Booked | 'taken' | 'gone'> {
  const appt = await WaAppointment.findOne({ _id: apptId, status: 'booked' });
  const svc = d.services.find((s) => s.id.equals(appt?.serviceId as Id));
  if (!appt || !svc) return 'gone';
  const startsAt = sastToUtc(date, time);
  const busy = await loadBusy(d.biz.slug, startsAt, new Date(startsAt.getTime() + 86400000), apptId);
  const candidates = timesOn(d, svc, date, busy, now).get(time) ?? [];
  if (!candidates.length) return 'taken';
  const ordered = [...candidates].sort((a, b) => Number(b.equals(appt.staffId as Id)) - Number(a.equals(appt.staffId as Id)));

  const endsAt = new Date(startsAt.getTime() + svc.minutes * 60000);
  const blocksUntil = new Date(endsAt.getTime() + bufferFor(d, svc) * 60000);
  const oldLocks = await WaSlotLock.find({ apptId: appt._id }).lean();
  const oldKeys = new Set(oldLocks.map((l) => key({ staffId: l.staffId as Id, grain: l.grain })));

  for (const staffId of ordered) {
    const wanted = grainsOf(staffId, startsAt, blocksUntil);
    const wantedKeys = new Set(wanted.map(key));
    try {
      await WaSlotLock.insertMany(wanted.filter((g) => !oldKeys.has(key(g))).map((g) => ({ ...g, apptId: appt._id })), { ordered: true });
    } catch (e) {
      // Take back only the rows this attempt added, never the ones the booking already held.
      const now2 = await WaSlotLock.find({ apptId: appt._id }).lean();
      await WaSlotLock.deleteMany({ _id: { $in: now2.filter((l) => !oldKeys.has(key({ staffId: l.staffId as Id, grain: l.grain }))).map((l) => l._id) } });
      if (isDuplicate(e)) continue;
      throw e;
    }
    await WaSlotLock.deleteMany({ _id: { $in: oldLocks.filter((l) => !wantedKeys.has(key({ staffId: l.staffId as Id, grain: l.grain }))).map((l) => l._id) } });
    const st = d.staff.find((s) => s.id.equals(staffId))!;
    await WaAppointment.updateOne({ _id: appt._id }, { $set: { staffId, staffName: st.name, date, time, startsAt, endsAt, blocksUntil, reminders: [] } });
    return { id: appt._id as Id, serviceId: svc.id, serviceName: svc.name, date, time, startsAt, endsAt, priceCents: appt.priceCents ?? 0, staffName: st.name };
  }
  return 'taken';
}

/** Cancels a booking and frees its time. Says whether it was inside the cancellation window. */
export async function cancelSlot(d: Data, apptId: string, now: Date): Promise<{ late: boolean } | null> {
  const appt = await WaAppointment.findOne({ _id: apptId, status: 'booked' });
  if (!appt) return null;
  const late = appt.startsAt.getTime() - now.getTime() < d.biz.cancelWindowHours * 3600000;
  await WaAppointment.updateOne({ _id: appt._id }, { $set: { status: 'cancelled', cancelledAt: now, cancelledLate: late } });
  await WaSlotLock.deleteMany({ apptId: appt._id });
  return { late };
}

/**
 * Frees time held by a lock whose booking never happened (a crash between the lock and the booking, or a cancel that
 * stopped half way). Only locks older than ten minutes and still in the future are looked at, so a booking in progress is safe.
 */
export async function releaseOrphanLocks(now: Date): Promise<number> {
  const cutoff = Types.ObjectId.createFromTime(Math.floor((now.getTime() - 10 * 60000) / 1000));
  const held = (await WaSlotLock.distinct('apptId', { grain: { $gte: now }, _id: { $lt: cutoff } })) as Id[];
  if (!held.length) return 0;
  const live = new Set((await WaAppointment.find({ _id: { $in: held }, status: 'booked' }, { _id: 1 }).lean()).map((a) => String(a._id)));
  const dead = held.filter((id) => !live.has(String(id)));
  if (!dead.length) return 0;
  return (await WaSlotLock.deleteMany({ apptId: { $in: dead } })).deletedCount ?? 0;
}
