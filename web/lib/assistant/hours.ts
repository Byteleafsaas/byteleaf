// Working hours: what an owner sets, and how questions about them are answered. Pure, so it is easy to test.
// Days run Monday (0) to Sunday (6). A day that closes at or before it opens runs past midnight (6pm to 2am; a close of 00:00 is midnight).
import { z } from 'zod';

export const DEFAULT_TIMEZONE = 'Africa/Johannesburg'; // SAST, UTC+2, no daylight saving
export const TIMEZONES: { value: string; label: string }[] = [
  { value: 'Africa/Johannesburg', label: 'South Africa (SAST, UTC+2)' },
  { value: 'Africa/Harare', label: 'Zimbabwe, Zambia, Mozambique (CAT, UTC+2)' },
  { value: 'Africa/Lagos', label: 'Nigeria (WAT, UTC+1)' },
  { value: 'Africa/Nairobi', label: 'Kenya (EAT, UTC+3)' },
  { value: 'Europe/London', label: 'United Kingdom' },
  { value: 'UTC', label: 'UTC' },
];

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const validTimezone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const dayHoursSchema = z
  .object({ open: z.boolean(), from: z.string().regex(TIME, 'Enter times like 08:00.'), to: z.string().regex(TIME, 'Enter times like 17:00.') })
  .refine((d) => !d.open || d.from !== d.to, 'A day can’t open and close at the same time.');

export const hoursSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().refine(validTimezone, 'Choose a time zone from the list.'),
  days: z.array(dayHoursSchema).length(7),
  note: z.string().trim().max(200, 'Keep the hours note under 200 characters.'),
});
export type DayHours = z.infer<typeof dayHoursSchema>;
export type WorkingHours = z.infer<typeof hoursSchema>;

const day = (open: boolean, from = '08:00', to = '17:00'): DayHours => ({ open, from, to });
export const DEFAULT_HOURS: WorkingHours = {
  enabled: false,
  timezone: DEFAULT_TIMEZONE,
  days: [day(true), day(true), day(true), day(true), day(true), day(true, '08:00', '13:00'), day(false)],
  note: '',
};

/* ---------- time maths ---------- */

const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const WEEKDAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** The weekday (0 = Monday) and minutes since midnight at `now` in the business's time zone. */
export function localTime(now: Date, timezone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: WEEKDAY[get('weekday')] ?? 0, minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

/** Opening and closing in minutes from midnight of the day it opens. The close passes 1440 when it runs into the next day. */
function windowOf(d: DayHours): { start: number; end: number } | null {
  if (!d.open) return null;
  const start = minutesOf(d.from);
  const end = minutesOf(d.to);
  return { start, end: end > start ? end : end + 1440 };
}

export type NextOpening = { daysAhead: number; day: number; time: string };
export type HoursStatus = { open: boolean; day: number; minutes: number; closesAt: string | null; next: NextOpening | null };

export function hoursStatus(h: WorkingHours, now: Date): HoursStatus {
  const { day: today, minutes } = localTime(now, h.timezone);
  const yesterday = (today + 6) % 7;
  const todayWin = windowOf(h.days[today]);
  const lastNight = windowOf(h.days[yesterday]);
  let closesAt: string | null = null;
  if (todayWin && minutes >= todayWin.start && minutes < todayWin.end) closesAt = h.days[today].to;
  else if (lastNight && lastNight.end > 1440 && minutes < lastNight.end - 1440) closesAt = h.days[yesterday].to;
  if (closesAt) return { open: true, day: today, minutes, closesAt, next: null };

  for (let ahead = 0; ahead <= 7; ahead++) {
    const d = (today + ahead) % 7;
    const win = windowOf(h.days[d]);
    if (win && (ahead > 0 || win.start > minutes)) return { open: false, day: today, minutes, closesAt: null, next: { daysAhead: ahead, day: d, time: h.days[d].from } };
  }
  return { open: false, day: today, minutes, closesAt: null, next: null };
}

/* ---------- wording ---------- */

/** '08:00' -> '8am', '17:30' -> '5:30pm', '00:00' -> 'midnight', '12:00' -> 'noon'. */
export function friendlyTime(t: string): string {
  const m = minutesOf(t);
  if (m === 0) return 'midnight';
  if (m === 720) return 'noon';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h % 12 || 12}${min ? `:${String(min).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

const range = (d: DayHours) => `${friendlyTime(d.from)} to ${friendlyTime(d.to)}`;

/** One line per run of days with the same hours: 'Monday to Friday: 8am to 5pm'. */
export function hoursLines(h: WorkingHours, days: number[] = [0, 1, 2, 3, 4, 5, 6]): string[] {
  const text = (i: number) => (h.days[i].open ? range(h.days[i]) : 'closed');
  const lines: string[] = [];
  for (let i = 0; i < days.length; ) {
    let j = i;
    while (j + 1 < days.length && days[j + 1] === days[j] + 1 && text(days[j + 1]) === text(days[i])) j++;
    const label = j === i ? DAY_NAMES[days[i]] : j === i + 1 ? `${DAY_NAMES[days[i]]} and ${DAY_NAMES[days[j]]}` : `${DAY_NAMES[days[i]]} to ${DAY_NAMES[days[j]]}`;
    lines.push(`${label}: ${text(days[i])}`);
    i = j + 1;
  }
  return lines;
}

/* ---------- detecting a question about hours ---------- */

export type HoursQuestion = { kind: 'now' | 'days' | 'week'; days: number[]; holiday: boolean };

const DAY_WORDS: [RegExp, number][] = [
  [/\bmon(day)?s?\b/, 0], [/\btue(s|sday)?s?\b/, 1], [/\bwed(nesday)?s?\b/, 2], [/\bthu(r|rs|rsday)?s?\b/, 3], [/\bfri(day)?s?\b/, 4], [/\bsat(urday)?s?\b/, 5], [/\bsun(day)?s?\b/, 6],
];

const HOURS_TOPIC = [
  /\b(opening|closing|trading|working|business|office|operating|operation|shop|showroom|store)\s+(hours|times?)\b/,
  /\bhours of (operation|business)\b/,
  /\b(your|the|our)\s+hours\b/,
  /\bwhat\s+(time|hour)s?\b.*\b(open|close|knock off|start|shut)/,
  /\bwhen\b.*\b(open|close|shut)\b/,
  /\b(are|is|r)\s+(you|u|we|they|the\s+\w+)\s+(guys\s+)?(still\s+)?(open|closed|closing|trading|working)\b/,
  /\bdo\s+(you|u)\s+(open|close|trade|work)\b/,
  /\b(open|closed)\s+(now|today|tonight|tomorrow|late|early|on|at|until|till|over|during|for)\b/,
  /\b(open|closed)\s+(mon|tue|wed|thu|fri|sat|sun|weekends?|public|holidays?)/,
  /\bopen\s+(\d|after|before)/,
  /\bhow late\b.*\b(open|trade|work)/,
];

const mentions = (q: string) => DAY_WORDS.filter(([re]) => re.test(q)).map(([, i]) => i);
const mentionsWhen = (q: string) => mentions(q).length > 0 || /\b(now|today|tonight|tomorrow|weekends?)\b/.test(q);

/**
 * Recognises "what time do you open?", "are you open on Sunday?", "are you open now?" and the like.
 * `previous` is the customer's last message, so "and Sunday?" after a question about hours still works.
 * `today` is the weekday (0 = Monday) in the business's time zone, to resolve "today" and "tomorrow".
 */
export function detectHoursQuestion(question: string, today: number, previous = ''): HoursQuestion | null {
  const q = question.toLowerCase();
  const asks = HOURS_TOPIC.some((re) => re.test(q));
  const followUp = !asks && q.split(/\s+/).length <= 4 && mentionsWhen(q) && HOURS_TOPIC.some((re) => re.test(previous.toLowerCase()));
  if (!asks && !followUp) return null;

  const days = new Set(mentions(q));
  if (/\btoday\b|\btonight\b/.test(q)) days.add(today);
  if (/\btomorrow\b/.test(q)) days.add((today + 1) % 7);
  if (/\bweekends?\b/.test(q)) { days.add(5); days.add(6); }
  if (/\bweekdays?\b/.test(q)) [0, 1, 2, 3, 4].forEach((i) => days.add(i));
  const holiday = /\bholiday|\bchristmas\b|\beaster\b|\bgood friday\b/.test(q);
  if (/\bnow\b|\bright now\b|\bcurrently\b|\bstill open\b/.test(q) && !days.size) return { kind: 'now', days: [], holiday };
  if (days.size) return { kind: 'days', days: [...days].sort((a, b) => a - b), holiday };
  return { kind: 'week', days: [], holiday };
}

/* ---------- answering ---------- */

export type HoursAnswer = { text: string; list?: string[] };

const when = (next: NextOpening) => {
  const at = friendlyTime(next.time);
  if (next.daysAhead === 0) return `today at ${at}`;
  if (next.daysAhead === 1) return `tomorrow at ${at}`;
  return `on ${DAY_NAMES[next.day]} at ${at}`;
};

const noteSuffix = (h: WorkingHours) => (h.note ? ` ${h.note.replace(/\s+$/, '')}${/[.!?]$/.test(h.note) ? '' : '.'}` : '');

function dayLabel(i: number, today: number) {
  if (i === today) return 'today';
  if (i === (today + 1) % 7) return 'tomorrow';
  return `on ${DAY_NAMES[i]}`;
}

/** The answer to a question about hours, straight from the owner's settings. Never needs a model. */
export function answerHoursQuestion(h: WorkingHours, q: HoursQuestion, now: Date): HoursAnswer {
  const st = hoursStatus(h, now);
  const anyOpen = h.days.some((d) => d.open);
  const note = noteSuffix(h);

  if (!anyOpen) return { text: `We're not open on any regular day right now.${note} Leave your question and a person will get back to you.` };

  if (q.kind === 'now') {
    if (st.open) return { text: `Yes, we're open right now. We close at ${friendlyTime(st.closesAt!)}.${note}` };
    return { text: `No, we're closed right now.${st.next ? ` We open again ${when(st.next)}.` : ''}${note}` };
  }

  if (q.kind === 'days' && q.days.length === 1) {
    const i = q.days[0];
    const d = h.days[i];
    const label = dayLabel(i, st.day);
    if (d.open) {
      // Today but already closed: say where things stand rather than a plain "yes".
      if (i === st.day && !st.open && st.next?.daysAhead !== 0) return { text: `We were open today from ${range(d)}, but we're closed now.${st.next ? ` We open again ${when(st.next)}.` : ''}${note}` };
      return { text: `Yes, we're open ${label}, from ${range(d)}.${note}` };
    }
    let after = '';
    if (i === st.day) after = st.next ? ` We open again ${when(st.next)}.` : '';
    else {
      for (let n = 1; n <= 7; n++) {
        const nd = (i + n) % 7;
        if (h.days[nd].open) { after = ` We open again on ${DAY_NAMES[nd]} at ${friendlyTime(h.days[nd].from)}.`; break; }
      }
    }
    return { text: `No, we're closed ${label}.${after}${note}` };
  }

  if (q.kind === 'week' && q.holiday) {
    const first = h.note ? noteSuffix(h).trim() : "I don't have anything listed for public holidays, so please check with the team.";
    return { text: `${first} Our usual hours are:`, list: hoursLines(h) };
  }

  const days = q.kind === 'days' ? q.days : [0, 1, 2, 3, 4, 5, 6];
  const isWeekend = q.kind === 'days' && days.length === 2 && days[0] === 5 && days[1] === 6;
  const lead = isWeekend ? 'Here are our weekend hours:' : q.kind === 'days' ? 'Here are those days:' : 'Here are our working hours:';
  return { text: lead, list: [...hoursLines(h, days), ...(h.note ? [h.note] : [])] };
}

/** The hours as trusted context for the model, with the current time so "open now" is right. */
export function hoursContext(h: WorkingHours, now: Date): string {
  const st = hoursStatus(h, now);
  const clock = `${DAY_NAMES[st.day]} ${String(Math.floor(st.minutes / 60)).padStart(2, '0')}:${String(st.minutes % 60).padStart(2, '0')}`;
  const state = st.open ? `We are open right now and close at ${friendlyTime(st.closesAt!)}.` : `We are closed right now.${st.next ? ` We next open ${when(st.next)}.` : ''}`;
  return [
    ...DAY_NAMES.map((n, i) => `${n}: ${h.days[i].open ? range(h.days[i]) : 'closed'}`),
    h.note ? `Note: ${h.note}` : '',
    `Time zone: ${h.timezone}. Right now it is ${clock}. ${state}`,
  ].filter(Boolean).join('\n');
}
