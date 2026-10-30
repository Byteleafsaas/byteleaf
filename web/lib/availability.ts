// Booking availability (HANDOFF-ADMIN §5.7). Pure: no I/O, so it can run on the server for any caller and be unit-tested.
import type { MeetingTypeKey, Settings } from '@/lib/admin/types';
import { addDays, isoWeekday, sastToUtc, todaySast } from '@/lib/server/time';

export type ActiveBooking = { date: string; time: string; durationMin: number };
/** date → meeting type → free start times (HH:mm SAST) */
export type AvailabilityMap = Record<string, Partial<Record<MeetingTypeKey, string[]>>>;

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** '15 min' → 15, 'None' → 0 */
export const parseBuffer = (s: string) => (/none/i.test(s) ? 0 : parseInt(s, 10) || 0);

/** Earliest instant a visitor may book, from the "minimum notice" setting. */
export function earliestStart(minNotice: string, workingDays: number[], now: Date): { instant: Date; fromDate: string } {
  const today = todaySast(now);
  if (/next working day/i.test(minNotice)) {
    let d = addDays(today, 1);
    for (let i = 0; i < 14 && !workingDays.includes(isoWeekday(d)); i++) d = addDays(d, 1);
    return { instant: sastToUtc(d, '00:00'), fromDate: d };
  }
  const hours = /week/i.test(minNotice) ? 168 : parseInt(minNotice, 10) || 24;
  return { instant: new Date(now.getTime() + hours * 3600000), fromDate: today };
}

export function computeAvailability(
  a: Settings['availability'],
  active: ActiveBooking[],
  opts: { now?: Date; days?: number; ignoreBookingKey?: string } = {},
): AvailabilityMap {
  const now = opts.now ?? new Date();
  const horizon = opts.days ?? 90;
  const { instant, fromDate } = earliestStart(a.minNotice, a.workingDays, now);
  const buffer = parseBuffer(a.bufferMin);
  const types = a.meetingTypes.filter((m) => m.enabled);
  const out: AvailabilityMap = {};

  let d = fromDate;
  const end = addDays(todaySast(now), horizon);
  for (; d <= end; d = addDays(d, 1)) {
    if (!a.workingDays.includes(isoWeekday(d))) continue;
    if (a.blocked.some((r) => d >= r.from && d <= r.to)) continue;
    const dayBookings = active.filter((b) => b.date === d);
    if (dayBookings.length >= a.maxPerDay) continue;

    const byType: AvailabilityMap[string] = {};
    for (const t of types) {
      const free = [...a.startTimes].sort().filter((time) => {
        if (sastToUtc(d, time) < instant) return false;
        const s = toMin(time);
        const e = s + t.minutes;
        // no overlap with another meeting, including the break between meetings
        return dayBookings.every((b) => {
          const bs = toMin(b.time);
          const be = bs + b.durationMin;
          return e + buffer <= bs || s >= be + buffer;
        });
      });
      if (free.length) byType[t.key] = free;
    }
    if (Object.keys(byType).length) out[d] = byType;
  }
  return out;
}

/** Whether one specific slot is still free (used to re-check on the server when a booking is submitted). */
export function isSlotFree(a: Settings['availability'], active: ActiveBooking[], type: MeetingTypeKey, date: string, time: string, now = new Date()) {
  return !!computeAvailability(a, active, { now, days: 120 })[date]?.[type]?.includes(time);
}
