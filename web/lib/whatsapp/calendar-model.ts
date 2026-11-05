// What the booking calendar draws, as pure functions: where a block sits, what state a start time is in, which status a
// booking shows. No React and no database, so the rules (including the double-booking warning) can be tested.
import { addDays, isoWeekday } from '@/lib/server/time';

/** The grid is 64px per hour, from 08:00 to 18:00 unless the hours need more. */
export const PX_PER_MIN = 64 / 60;
export const GRID_MIN = 8 * 60;
export const GRID_MAX = 18 * 60;

export type BookingStatus = 'confirmed' | 'unconfirmed' | 'noshow';
export type Reminder = 'confirmed' | 'sent' | 'failed' | 'none';

/** The row the calendar shows for one booking. Times are minutes after midnight, SAST. */
export type Booking = {
  id: string;
  date: string;
  staffId: string;
  /** Minutes the booking starts and ends, and the clean-up after it. */
  s: number;
  e: number;
  buf: number;
  client: string;
  service: string;
  price: string;
  source: 'wa' | 'hand';
  status: BookingStatus;
  phone: string;
  /** "Booked on WhatsApp · Mon 2 Nov, 19:42" or "Added by Lerato · …" */
  sourceLine: string;
  reminder: Reminder;
  history: string;
  note: string;
};

export const STATUS_LABEL: Record<BookingStatus, string> = { confirmed: 'Confirmed', unconfirmed: 'Unconfirmed', noshow: 'No-show' };

/** A booking is unconfirmed until the client confirms from a reminder. Bookings the owner typed in are confirmed. */
export function statusOf(a: { status: string; source: string; confirmedAt?: Date | null }): BookingStatus {
  if (a.status === 'no_show') return 'noshow';
  if (a.source === 'manual' || a.confirmedAt) return 'confirmed';
  return 'unconfirmed';
}

/** The Monday of the week a date is in. */
export const weekStart = (date: string) => addDays(date, 1 - isoWeekday(date));
export const weekDates = (date: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i));

export const y = (min: number, g0 = GRID_MIN) => Math.round((min - g0) * PX_PER_MIN);

/** A time can be picked when the whole service fits inside working time (a break splits the day) and it is not in the past. */
export type SlotState = { state: 'off' | 'free' | 'busy'; clash?: { client: string; s: number; e: number } };

export function slotState(o: {
  /** Working ranges for that person that day, after breaks, time off and closing. */
  ranges: [number, number][];
  /** Other bookings that day. `e` includes the clean-up after them. */
  busy: { client: string; s: number; e: number }[];
  start: number;
  length: number;
  /** Minutes after midnight now, when the day is today; null for a future day; Infinity for a past day. */
  nowMin: number | null;
}): SlotState {
  const fits = o.ranges.some(([a, b]) => o.start >= a && o.start + o.length <= b);
  const past = o.nowMin !== null && o.start < o.nowMin;
  if (!fits || past) return { state: 'off' };
  const clash = o.busy.find((b) => o.start < b.e && o.start + o.length > b.s);
  return clash ? { state: 'busy', clash } : { state: 'free' };
}

/** How much of a person's working day is still free, in minutes. Used for the "fully booked" banner. */
export function freeMinutes(ranges: [number, number][], busy: { s: number; e: number }[]): number {
  let free = ranges.reduce((n, [a, b]) => n + (b - a), 0);
  for (const b of busy) for (const [a, z] of ranges) free -= Math.max(0, Math.min(z, b.e) - Math.max(a, b.s));
  return Math.max(0, free);
}

/** The phone number as the owner sees it in lists: +27 82 *** 4471. A placeholder (no number on file) reads "No number yet". */
export function maskPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (!/^\d{9,15}$/.test(p) || d.length < 9) return 'No number yet';
  const cc = d.startsWith('27') ? '27' : d.slice(0, 2);
  return `+${cc} ${d.slice(cc.length, cc.length + 2)} *** ${d.slice(-4)}`;
}

/** Whether a number can receive WhatsApp messages (a hand-added client may have none). */
export const hasNumber = (p: string) => /^\d{9,15}$/.test(p);

/** "6th visit · last: Knotless braids, 14 Sep" */
export function historyLine(visits: number, last?: { service: string; date: string }): string {
  if (visits <= 1) return 'New client';
  const th = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]}`;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mon = last ? `${Number(last.date.slice(8))} ${MON[Number(last.date.slice(5, 7)) - 1]}` : '';
  return `${th(visits)} visit${last ? ` · last: ${last.service}, ${mon}` : ''}`;
}
