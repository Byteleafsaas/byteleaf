// Small helpers the sample site's pages share: links, the phone and WhatsApp details, opening hours in words and which
// photos each page shows. Pure, so they can be tested.
import { isPlaceholder, rands, waDigits } from './rules';
import type { Block, Hours, PageKey, Photo, Service, Settings, Snapshot } from './types';

/** Where the sample site lives inside the byteleaf demo. On a client's own domain this would be empty. */
export const SAMPLE_BASE = '/projects/launch-website/sample';
export const siteHref = (path: '' | 'services' | 'about' | 'gallery' | 'contact' = '') => `${SAMPLE_BASE}${path ? `/${path}` : ''}`;

/** The text of a block on a page. */
export function blockValue(s: Snapshot, page: PageKey, id: string): string {
  const b = s.pages[page].find((x) => x.id === id);
  return b && 'value' in b ? b.value : '';
}
export const blockOf = (s: Snapshot, page: PageKey, id: string): Block | undefined => s.pages[page].find((x) => x.id === id);
export const sectionOn = (s: Snapshot, page: PageKey, id: string) => {
  const b = blockOf(s, page, id);
  return !b || b.type !== 'section' || b.on;
};

/** A tel: link, or null while the number is still a [placeholder] or not a number. */
export function telHref(phone: string): string | null {
  const d = phone.replace(/[\s\-()]/g, '');
  return /^(\+27|0)\d{9}$/.test(d) ? `tel:${d.startsWith('0') ? `+27${d.slice(1)}` : d}` : null;
}

/** A wa.me link when there is a real number, otherwise the Contact page. */
export function waLink(s: Settings): string {
  const d = waDigits(s);
  return d.length >= 9 ? `https://wa.me/${d}?text=${encodeURIComponent(`Hi ${s.name}, I'd like to book a wash.`)}` : siteHref('contact');
}

export const hasRealWhatsApp = (s: Settings) => waDigits(s).length >= 9;

/** "Mon–Sat, 07:00–17:00" when the weekday and Saturday hours match, otherwise both. Sunday "Closed" is described separately. */
export function hoursLine(h: Hours): string {
  const wk = h.weekdays.trim();
  const sa = h.saturday.trim();
  if (!wk || /^closed$/i.test(wk)) return /^closed$/i.test(sa) || !sa ? 'By appointment' : `Sat, ${sa}`;
  if (wk === sa) return `Mon–Sat, ${wk}`;
  return /^closed$/i.test(sa) || !sa ? `Mon–Fri, ${wk}` : `Mon–Fri, ${wk} · Sat, ${sa}`;
}
export const closedLine = (h: Hours) => (/^closed$/i.test(h.sunday.trim()) || !h.sunday.trim() ? 'Closed Sundays and public holidays' : `Sun, ${h.sunday}`);

/** The lowest price among services that are on the site, or null when none has a fixed price. */
export function fromPrice(services: Service[]): string | null {
  const prices = services.filter((x) => x.visible && x.price !== null).map((x) => x.price as number);
  return prices.length ? rands(Math.min(...prices)) : null;
}

export const areaSpan = (areas: string[]) => (areas.length >= 2 ? `${areas[0]} to ${areas[Math.min(3, areas.length - 1)]}` : areas[0] ?? '');

export const phoneShown = (s: Settings) => s.phone;
export const isPlaceholderText = isPlaceholder;

/** The photo the Home page uses, or null (then the prices card shows). */
export function homePhoto(s: Snapshot): Photo | null {
  const b = blockOf(s, 'home', 'h4');
  return b && b.type === 'image' ? s.photos.find((p) => p.id === b.value) ?? null : null;
}
export function aboutPhoto(s: Snapshot): Photo | null {
  const b = blockOf(s, 'about', 'a3');
  return b && b.type === 'image' ? s.photos.find((p) => p.id === b.value) ?? null : null;
}
export const galleryPhotos = (s: Snapshot) => s.photos.filter((p) => p.on.gallery);

/** Every page can be shown without photos (`?photos=false`), as it looks before the owner has any. */
export const wantsPhotos = (param: string | string[] | undefined) => param !== 'false';
