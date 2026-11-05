// The working week as the Staff & hours screen edits it, and the maths behind its live preview. Pure, so the same
// rules the customer sees in WhatsApp can be tested here. Times are minutes after midnight (08:00 is 480), SAST.
import { fromMin, toMin, type Range, type WeekHours } from './slots';

/** One weekday. `br` is an optional break inside the working day. Index 0 is Monday. */
export type Day = { open: boolean; a: number; b: number; br: [number, number] | null };
export type Week = Day[];

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const timeText = (m: number) => fromMin(m);

/** A week with every day closed. */
export const closedWeek = (): Week => Array.from({ length: 7 }, () => ({ open: false, a: 480, b: 1080, br: null }));

/** Stored hours (weekday 1 to 7 to ranges) into the editable week. A break is the gap between two ranges. */
export function weekFromHours(h: WeekHours | null | undefined): Week {
  return Array.from({ length: 7 }, (_, i) => {
    const r = [...(h?.[i + 1] ?? [])].sort((p, q) => toMin(p.start) - toMin(q.start));
    if (!r.length) return { open: false, a: 480, b: 1080, br: null };
    const a = toMin(r[0].start);
    const b = toMin(r[r.length - 1].end);
    return { open: true, a, b, br: r.length > 1 ? [toMin(r[0].end), toMin(r[1].start)] : null };
  });
}

/** The editable week back into stored hours. Closed days are left out. */
export function hoursFromWeek(w: Week): WeekHours {
  const out: WeekHours = {};
  w.forEach((d, i) => {
    if (!d.open) return;
    const ranges: Range[] = d.br && d.br[0] > d.a && d.br[1] < d.b && d.br[1] > d.br[0]
      ? [{ start: fromMin(d.a), end: fromMin(d.br[0]) }, { start: fromMin(d.br[1]), end: fromMin(d.b) }]
      : [{ start: fromMin(d.a), end: fromMin(d.b) }];
    out[i + 1] = ranges;
  });
  return out;
}

/** The first problem with a week, in words, or null when it can be saved. */
export function weekProblem(w: Week): string | null {
  for (let i = 0; i < 7; i++) {
    const d = w[i];
    if (d.open && d.b <= d.a) return `${DAY_NAMES[i]}: closing time must be after opening time.`;
    if (d.open && d.br && (d.br[0] <= d.a || d.br[1] >= d.b || d.br[1] <= d.br[0])) return `${DAY_NAMES[i]}: the break must fall inside the working day.`;
  }
  return null;
}

export type Preview = { start: number; free: boolean }[];

/**
 * The start times a client would be offered on one day: every 30 minutes, only where the whole service fits before
 * closing or a break. A time already taken (booking plus its clean-up) is kept in the list, marked not free, so the
 * owner can see why it is missing. A time is free when at least one person who can do the service is free then.
 */
export function previewSlots(o: { people: { week: Week; busy: [number, number][] }[]; weekdayIndex: number; minutes: number; bufferMin: number; stepMin?: number }): Preview {
  const step = o.stepMin ?? 30;
  const seen = new Map<number, boolean>();
  for (const p of o.people) {
    const d = p.week[o.weekdayIndex];
    if (!d?.open || d.b <= d.a) continue;
    const brk = d.br && d.br[0] > d.a && d.br[1] < d.b ? d.br : null;
    const ranges: [number, number][] = brk ? [[d.a, brk[0]], [brk[1], d.b]] : [[d.a, d.b]];
    for (const [from, to] of ranges) {
      for (let m = from; m + o.minutes <= to; m += step) {
        const taken = p.busy.some(([s, e]) => m < e && s < m + o.minutes + o.bufferMin);
        seen.set(m, (seen.get(m) ?? false) || !taken);
      }
    }
  }
  return [...seen.entries()].sort((x, y) => x[0] - y[0]).map(([start, free]) => ({ start, free }));
}
