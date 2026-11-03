// Which start times can a customer be offered? Pure: no database, so it can be tested and reused by the calendar.
import { addDays, isoWeekday, sastToUtc, todaySast } from '@/lib/server/time';

export type Range = { start: string; end: string }; // 'HH:mm' SAST
/** Weekday (1 = Monday ... 7 = Sunday) to the ranges worked that day. A day with no entry is a day off. */
export type WeekHours = Record<number, Range[]>;
/** A period that is already taken. `end` includes any buffer after the appointment. */
export type Busy = { start: Date; end: Date };

export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** The time that is inside both lists of ranges. Used to keep staff hours within the business's opening hours. */
export function intersect(a: Range[], b: Range[]): Range[] {
  const out: Range[] = [];
  for (const x of a) {
    for (const y of b) {
      const s = Math.max(toMin(x.start), toMin(y.start));
      const e = Math.min(toMin(x.end), toMin(y.end));
      if (e > s) out.push({ start: fromMin(s), end: fromMin(e) });
    }
  }
  return out.sort((p, q) => toMin(p.start) - toMin(q.start));
}

/** The ranges someone works on a date, after their days off. */
export function rangesOn(date: string, week: WeekHours, daysOff: { from: string; to: string }[] = []): Range[] {
  if (daysOff.some((d) => date >= d.from && date <= d.to)) return [];
  return week[isoWeekday(date)] ?? [];
}

export type SlotOptions = {
  date: string;
  ranges: Range[];
  busy: Busy[];
  durationMin: number;
  bufferMin: number;
  stepMin: number;
  /** Nothing earlier than this can be booked (minimum notice). */
  notBefore: Date;
};

/** Start times ('HH:mm') on one date where the whole appointment, plus its buffer, fits. */
export function freeStarts(o: SlotOptions): string[] {
  const out: string[] = [];
  const need = o.durationMin + o.bufferMin;
  for (const r of o.ranges) {
    const end = toMin(r.end);
    for (let s = toMin(r.start); s + o.durationMin <= end; s += o.stepMin) {
      const start = sastToUtc(o.date, fromMin(s));
      if (start < o.notBefore) continue;
      const stop = new Date(start.getTime() + need * 60000);
      if (o.busy.some((b) => start < b.end && b.start < stop)) continue;
      out.push(fromMin(s));
    }
  }
  return out;
}

/** The next dates (from today) that fall within the booking window, in order. */
export function windowDates(now: Date, days: number): string[] {
  const first = todaySast(now);
  return Array.from({ length: days }, (_, i) => addDays(first, i));
}
