// Shared admin formatting helpers. All dates/times are Africa/Johannesburg (SAST).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 'YYYY-MM-DD' parts. */
export function parseKey(k: string) {
  const [y, m, d] = k.split('-').map(Number);
  return { y, m: m - 1, d };
}
export const toKey = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const weekdayOf = (k: string) => {
  const { y, m, d } = parseKey(k);
  return new Date(Date.UTC(y, m, d)).getUTCDay();
};
export function addDaysKey(k: string, n: number) {
  const { y, m, d } = parseKey(k);
  const dt = new Date(Date.UTC(y, m, d + n));
  return toKey(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

/** Today in Johannesburg as 'YYYY-MM-DD'. */
export function todayKey(): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
/** Current hour (0–23) in Johannesburg. */
export function sastHour(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Johannesburg', hour: '2-digit', hour12: false }).format(new Date())) % 24;
}

/** 'Tue 3 Nov' */
export function fmtDay(k: string) {
  const { m, d } = parseKey(k);
  return `${DAYS[weekdayOf(k)]} ${d} ${MONTHS[m]}`;
}
/** 'Tuesday, 3 November 2026' style long date. */
export function fmtLong(k: string) {
  const { y, m, d } = parseKey(k);
  return `${DAYS_LONG[weekdayOf(k)]} ${d} ${MONTHS_LONG[m]} ${y}`;
}
/** '3 Nov 2026' */
export function fmtShort(k: string) {
  const { y, m, d } = parseKey(k);
  return `${d} ${MONTHS[m]} ${y}`;
}

export const initials = (name: string) => {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

/** Money is integer cents. 4800000 → 'R 48 000.00' (single helper, no Intl locale reliance). */
export function formatZAR(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const rands = Math.floor(abs / 100);
  const c = String(abs % 100).padStart(2, '0');
  const grouped = String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '−' : ''}R ${grouped}.${c}`;
}

/** Half-up rounding to the nearest cent. */
export const roundHalfUp = (n: number) => Math.floor(n + 0.5 + Number.EPSILON);
