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

const ISO_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const spans = (r: Range[]) => r.map((x) => `${x.start}–${x.end}`).join(', ');

/** 'Tuesday to Friday 08:00–18:00 and Saturday 08:00–16:00': what a customer is told when the salon is closed. */
export function describeHours(week: WeekHours): string {
  const runs: { from: number; to: number; text: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    const r = week[d] ?? [];
    if (!r.length) continue;
    const text = spans(r);
    const last = runs[runs.length - 1];
    if (last && last.to === d - 1 && last.text === text) last.to = d;
    else runs.push({ from: d, to: d, text });
  }
  const parts = runs.map((r) => `${r.from === r.to ? ISO_DAYS[r.from - 1] : `${ISO_DAYS[r.from - 1]} ${r.to === r.from + 1 ? 'and' : 'to'} ${ISO_DAYS[r.to - 1]}`} ${r.text}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] ?? 'by appointment';
}

/** True when `now` falls inside the opening hours. */
export function isOpenAt(now: Date, week: WeekHours, daysOff: { from: string; to: string }[] = []): boolean {
  const sast = new Date(now.getTime() + 2 * 3600000);
  const mins = sast.getUTCHours() * 60 + sast.getUTCMinutes();
  return rangesOn(todaySast(now), week, daysOff).some((r) => mins >= toMin(r.start) && mins < toMin(r.end));
}

/** JavaScript weekdays (0 = Sunday ... 6 = Saturday) on which the business never opens. */
export function closedWeekdays(week: WeekHours): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((w) => !(week[w === 0 ? 7 : w] ?? []).length);
}
