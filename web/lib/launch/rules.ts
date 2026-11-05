// The limits and checks the admin enforces (HANDOFF-LAUNCH §5). Pure, so the same rules run in the editor, on the server and in tests.
import type { Block, Service, Settings } from './types';

/** A value still in [square brackets] is a placeholder the owner fills in later, so it is never reported as wrong. */
export const isPlaceholder = (v: string) => /^\[.*\]$/.test(v.trim());

/** A South African number: +27 or 0, then nine digits, with spaces, dashes and brackets allowed. */
export function phoneProblem(v: string, required = true): string | null {
  const t = v.trim();
  if (!t) return required ? 'Please add a phone number.' : null;
  if (isPlaceholder(t)) return null;
  const d = t.replace(/[\s\-()]/g, '');
  return /^(\+27|0)\d{9}$/.test(d) ? null : 'That doesn’t look like a South African number. Use 10 digits, like 082 123 4567.';
}

export function emailProblem(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Add the email address enquiries should go to.';
  if (isPlaceholder(t)) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? null : 'That email address looks incomplete.';
}

/** The first problem with a block, in words, or null. */
export function blockProblem(b: Block): string | null {
  if (b.type === 'heading' || b.type === 'button') {
    if (!b.value.trim()) return b.type === 'button' ? 'Give the button a label.' : 'Add a heading.';
    if (b.value.length > b.max) return `Use ${b.max} characters or fewer (now ${b.value.length}).`;
  }
  if (b.type === 'text' && b.value.length > b.max) return `Use ${b.max} characters or fewer (now ${b.value.length}).`;
  return null;
}

/** How full a counted block is: 'over' past the limit, 'near' from 85%, else 'ok'. */
export function counterState(len: number, max: number): 'ok' | 'near' | 'over' {
  return len > max ? 'over' : len >= max * 0.85 ? 'near' : 'ok';
}

export const SERVICE_NAME_MAX = 40;
export const INCLUDED_MAX = 6;
export const AREAS_MAX = 10;
export const AREA_MAX = 28;
export const NAME_MAX = 40;

export type ServiceErrors = Partial<Record<'name' | 'price' | 'time', string>>;
export function serviceProblems(s: { name: string; price: number | null | undefined; time: string; included: string[] }): ServiceErrors {
  const e: ServiceErrors = {};
  if (!s.name.trim()) e.name = 'Give the service a name.';
  else if (s.name.length > SERVICE_NAME_MAX) e.name = `Use ${SERVICE_NAME_MAX} characters or fewer.`;
  if (s.price === undefined || (s.price !== null && (!Number.isInteger(s.price) || s.price < 0))) e.price = 'Enter a price in whole rands, or tick “No fixed price”.';
  if (!s.time.trim()) e.time = 'Say how long it takes.';
  return e;
}

export type SettingsErrors = Partial<Record<'name' | 'phone' | 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'areas', string>>;
export function settingsProblems(s: Settings): SettingsErrors {
  const e: SettingsErrors = {};
  if (!s.name.trim()) e.name = 'Add your business name.';
  else if (s.name.length > NAME_MAX) e.name = `Use ${NAME_MAX} characters or fewer.`;
  const p = phoneProblem(s.phone);
  if (p) e.phone = p;
  if (!s.whatsappSame) { const w = phoneProblem(s.whatsapp); if (w) e.whatsapp = w; }
  const m = emailProblem(s.email);
  if (m) e.email = m;
  if (s.instagram.trim() && !/instagram\.com\//i.test(s.instagram)) e.instagram = 'An Instagram link contains “instagram.com/”.';
  if (s.facebook.trim() && !/facebook\.com\//i.test(s.facebook)) e.facebook = 'A Facebook link contains “facebook.com/”.';
  if (s.areas.length > AREAS_MAX) e.areas = `Up to ${AREAS_MAX} areas.`;
  else if (s.areas.some((a) => !a.trim() || a.length > AREA_MAX)) e.areas = `Each area is 1 to ${AREA_MAX} characters.`;
  return e;
}

/** The logo word: the first word of the business name, lower case, followed by a full stop in the site's sun colour. */
export const logoWord = (name: string) => (name.trim().split(/\s+/)[0] || 'your').toLowerCase();

/** The number WhatsApp links use: digits only, with a leading 0 turned into 27. */
export function waDigits(s: Pick<Settings, 'phone' | 'whatsapp' | 'whatsappSame'>): string {
  const raw = (s.whatsappSame ? s.phone : s.whatsapp).replace(/[\s\-()+]/g, '');
  if (!/^\d+$/.test(raw)) return '';
  return raw.startsWith('0') ? `27${raw.slice(1)}` : raw;
}

export const rands = (n: number | null) => (n === null ? 'Ask for a price' : `R ${n.toLocaleString('en-ZA').replace(/[, ]/g, ' ')}`);
