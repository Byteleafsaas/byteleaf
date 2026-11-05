// Understanding what a customer typed when they could have tapped. Pure and forgiving, because people type "8am", "sat" or "tmrw".
import { MONTH_NAMES, WEEKDAY_NAMES, weekdayOf } from './copy';
import { addDays, todaySast } from '@/lib/server/time';

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9:.\s]/g, ' ').replace(/\s+/g, ' ').trim();

const pad = (n: number) => String(n).padStart(2, '0');

/** '8am' -> '08:00', '14:30' -> '14:30', '2 pm' -> '14:00', '8' -> '08:00', '3' -> '15:00'. Null when it isn't a time. */
export function parseTime(text: string): string | null {
  const t = norm(text).replace(/\s+/g, '');
  let m = t.match(/^(\d{1,2})[:.h](\d{2})(am|pm)?$/);
  let h: number;
  let min: number;
  let ap: string | undefined;
  if (m) { h = +m[1]; min = +m[2]; ap = m[3]; }
  else if ((m = t.match(/^(\d{1,2})(am|pm)$/))) { h = +m[1]; min = 0; ap = m[2]; }
  else if ((m = t.match(/^(\d{1,2})$/))) {
    h = +m[1]; min = 0;
    // A bare hour in a booking chat: 7 to 12 means morning, 1 to 6 means afternoon.
    if (h >= 1 && h <= 6) h += 12;
  } else return null;
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/**
 * Picks one of the offered dates from words like 'tomorrow', 'saturday', 'sat' or '8 nov'.
 * Only dates that are actually offered can be chosen, so the customer can't land on a closed day.
 */
export function parseDay(text: string, offered: string[], now: Date): string | null {
  const t = norm(text);
  if (!t) return null;
  const today = todaySast(now);
  if (/^(today|2day)$/.test(t)) return offered.includes(today) ? today : null;
  if (/^(tomorrow|tmrw|tmr|2moro|tomorow)$/.test(t)) {
    const d = addDays(today, 1);
    return offered.includes(d) ? d : null;
  }
  const wd = WEEKDAY_NAMES.findIndex((n) => t === n || (t.length >= 3 && n.startsWith(t) && t.length <= n.length));
  if (wd !== -1) return offered.find((d) => weekdayOf(d) === wd) ?? null;
  const dm = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})$/);
  if (dm) {
    const mi = MONTH_NAMES.findIndex((m) => dm[2].startsWith(m));
    if (mi !== -1) return offered.find((d) => Number(d.slice(8, 10)) === +dm[1] && Number(d.slice(5, 7)) - 1 === mi) ?? null;
  }
  return null;
}

export type When = { weekday: number } | { date: string };

/**
 * Reads a day the customer typed even when it isn't one we offer, so we can say why ('we're closed on Mondays', 'that date has passed').
 * A weekday name gives { weekday }; '3rd' or '3 nov' gives that date in the current year (which may already be behind us).
 */
export function parseWhen(text: string, now: Date): When | null {
  const t = norm(text).replace(/^(the|on|this|next)\s+/, '');
  if (!t) return null;
  const wd = WEEKDAY_NAMES.findIndex((n) => t === n || (t.length >= 3 && n.startsWith(t)));
  if (wd !== -1) return { weekday: wd };
  const today = todaySast(now);
  const year = today.slice(0, 4);
  const iso = (m: number, d: number) => (m >= 0 && m < 12 && d >= 1 && d <= 31 ? `${year}-${pad(m + 1)}-${pad(d)}` : null);
  const dm = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})$/);
  if (dm) {
    const mi = MONTH_NAMES.findIndex((m) => dm[2].startsWith(m));
    const d = mi === -1 ? null : iso(mi, +dm[1]);
    return d ? { date: d } : null;
  }
  const only = t.match(/^(\d{1,2})(?:st|nd|rd|th)$/);
  if (only) { const d = iso(+today.slice(5, 7) - 1, +only[1]); return d ? { date: d } : null; }
  return null;
}

export const isStop = (t: string) => /^(stop|unsubscribe|opt out|optout|end)$/.test(t);
export const isStart = (t: string) => /^(start|resume|unstop|subscribe)$/.test(t);
export const wantsMenu = (t: string) => /^(menu|hi|hello|hey|hie|howzit|start over|restart|home|help|back)$/.test(t);
export const wantsPerson = (t: string) => /^(person|human|agent|receptionist|staff|someone|call me|talk to a person|speak to a person|speak to someone|talk to someone)$/.test(t);
export const wantsMine = (t: string) => /^(my bookings?|my appointments?|cancel|reschedule|change|change booking|cancel booking)$/.test(t);
export const wantsBook = (t: string) => /^(book|book now|book appointment|book an appointment|make a booking|new booking|booking|appointment)$/.test(t) || /^i (want|would like|d like) to book/.test(t) || /^book (a|an|me)\b/.test(t);
export const yes = (t: string) => /^(yes|y|yeah|yebo|yep|ok|okay|sure|confirm|confirmed|please do)$/.test(t);
export const no = (t: string) => /^(no|n|nope|nah|cancel|never mind|nevermind)$/.test(t);
