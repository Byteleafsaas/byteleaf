// Changes the owner can make to services and photos, as pure functions on a snapshot. They never touch the live site:
// the caller applies them to the saved draft, and publishing is a separate, deliberate step.
import { INCLUDED_MAX, serviceProblems } from './rules';
import type { Photo, Service, Snapshot } from './types';

const idPart = () => Math.random().toString(36).slice(2, 8);

export type ServiceInput = { id?: string; name: string; price: number | null | undefined; time: string; summary?: string; included: string[]; visible: boolean };
type Result = { ok: true; snapshot: Snapshot; id: string } | { ok: false; error: string };

/** Adds a service, or changes one. Blank "included" lines are dropped and at most six are kept. */
export function upsertService(s: Snapshot, i: ServiceInput): Result {
  const included = i.included.map((x) => x.trim()).filter(Boolean);
  if (included.length > INCLUDED_MAX) return { ok: false, error: `List up to ${INCLUDED_MAX} things that are included.` };
  const errors = serviceProblems({ name: i.name, price: i.price, time: i.time, included });
  const first = Object.values(errors)[0];
  if (first) return { ok: false, error: first };
  const next: Service = { id: i.id ?? `sv${idPart()}`, name: i.name.trim(), price: i.price ?? null, time: i.time.trim(), summary: (i.summary ?? '').trim(), included, visible: i.visible };
  if (i.id) {
    if (!s.services.some((x) => x.id === i.id)) return { ok: false, error: 'That service no longer exists.' };
    return { ok: true, id: next.id, snapshot: { ...s, services: s.services.map((x) => (x.id === i.id ? next : x)) } };
  }
  return { ok: true, id: next.id, snapshot: { ...s, services: [...s.services, next] } };
}

export function reorderServices(s: Snapshot, ids: string[]): Snapshot | null {
  if (ids.length !== s.services.length || new Set(ids).size !== ids.length || !ids.every((id) => s.services.some((x) => x.id === id))) return null;
  return { ...s, services: ids.map((id) => s.services.find((x) => x.id === id)!) };
}

export const removeService = (s: Snapshot, id: string): Snapshot | null => (s.services.some((x) => x.id === id) ? { ...s, services: s.services.filter((x) => x.id !== id) } : null);

/** The first services that are switched on, in order: what the Home page shows (at most six). */
export const homeServices = (services: Service[]) => services.filter((x) => x.visible).slice(0, 6);

export function addPhoto(s: Snapshot, p: { key: string; w: number; alt?: string }): { snapshot: Snapshot; id: string } {
  const id = `u${idPart()}`;
  const photo: Photo = { id, kind: 'upload', key: p.key, w: p.w, alt: (p.alt ?? '').trim(), caption: (p.alt ?? '').trim(), on: { home: false, about: false, gallery: true } };
  return { id, snapshot: { ...s, photos: [...s.photos, photo] } };
}

/** Changes a photo's description or where it shows. Only one photo can be the Home photo, and only one the About photo: choosing a new one moves it. */
export function updatePhoto(s: Snapshot, id: string, patch: { alt?: string; on?: Partial<Photo['on']> }): Snapshot | null {
  const cur = s.photos.find((p) => p.id === id);
  if (!cur) return null;
  const on = { ...cur.on, ...patch.on };
  let photos = s.photos.map((p) => (p.id === id ? { ...p, alt: patch.alt !== undefined ? patch.alt.trim() : p.alt, caption: patch.alt !== undefined ? patch.alt.trim() : p.caption, on } : p));
  for (const where of ['home', 'about'] as const) {
    if (patch.on?.[where]) photos = photos.map((p) => (p.id === id ? p : { ...p, on: { ...p.on, [where]: false } }));
  }
  // The page blocks follow: the Home and About pictures are whichever photo is marked for that page.
  const pick = (where: 'home' | 'about') => photos.find((p) => p.on[where])?.id ?? '';
  const pages = { ...s.pages, home: s.pages.home.map((b) => (b.type === 'image' ? { ...b, value: pick('home') } : b)), about: s.pages.about.map((b) => (b.type === 'image' ? { ...b, value: pick('about') } : b)) };
  return { ...s, photos, pages };
}

export function movePhoto(s: Snapshot, id: string, dir: -1 | 1): Snapshot | null {
  const i = s.photos.findIndex((p) => p.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= s.photos.length) return null;
  const photos = s.photos.slice();
  [photos[i], photos[j]] = [photos[j], photos[i]];
  return { ...s, photos };
}

/** Which pages lose this photo if it is removed. */
export function photoUsedOn(s: Snapshot, id: string): ('home' | 'about' | 'gallery')[] {
  const p = s.photos.find((x) => x.id === id);
  return p ? (['home', 'about', 'gallery'] as const).filter((w) => p.on[w]) : [];
}

export function removePhoto(s: Snapshot, id: string): Snapshot | null {
  if (!s.photos.some((p) => p.id === id)) return null;
  const clear = (v: string) => (v === id ? '' : v);
  const pages = { ...s.pages, home: s.pages.home.map((b) => (b.type === 'image' ? { ...b, value: clear(b.value) } : b)), about: s.pages.about.map((b) => (b.type === 'image' ? { ...b, value: clear(b.value) } : b)) };
  return { ...s, photos: s.photos.filter((p) => p.id !== id), pages };
}

/** Photos that still need a description, for the "Needs a description" filter. */
export const needsAlt = (photos: Photo[]) => photos.filter((p) => !p.alt.trim());
