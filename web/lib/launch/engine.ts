// Drafts, publishing and undo (HANDOFF-LAUNCH §5, "Publish bar"). Pure functions over `SiteState`.
//   live   = what customers see
//   saved  = the owner's saved draft (not yet shown to customers)
// The unpublished changes are never stored: they are worked out by comparing the two, so the list is always honest.
import { PAGES, PAGE_NAMES, type Block, type Change, type Photo, type Service, type Snapshot, type SiteState } from './types';
import { rands } from './rules';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const blockWord = (b: Block) => b.label.toLowerCase();

function pageChange(page: (typeof PAGES)[number], live: Block[], saved: Block[]): Change | null {
  const names = saved.filter((b, i) => !same(b, live[i])).map(blockWord);
  return names.length ? { id: `page-${page}`, label: `${PAGE_NAMES[page]} page: ${names.join(', ')} edited` } : null;
}

function serviceChanges(live: Service[], saved: Service[]): Change[] {
  const out: Change[] = [];
  const old = new Map(live.map((s) => [s.id, s]));
  for (const s of saved) {
    const o = old.get(s.id);
    if (!o) { out.push({ id: `service-${s.id}`, label: `${s.name || 'New service'} added` }); continue; }
    const bits: string[] = [];
    if (o.price !== s.price) bits.push(`price ${rands(o.price)} → ${rands(s.price)}`);
    if (o.name !== s.name) bits.push(`renamed from ${o.name}`);
    if (o.time !== s.time) bits.push(`time ${o.time} → ${s.time}`);
    if (!same(o.included, s.included) || o.summary !== s.summary) bits.push('what’s included edited');
    if (o.visible !== s.visible) bits.push(s.visible ? 'shown on the site' : 'hidden from the site');
    if (bits.length) out.push({ id: `service-${s.id}`, label: `${s.name}: ${bits.join(', ')}` });
  }
  for (const o of live) if (!saved.some((s) => s.id === o.id)) out.push({ id: `service-${o.id}`, label: `${o.name} removed` });
  const kept = saved.filter((s) => old.has(s.id)).map((s) => s.id);
  if (!same(kept, live.filter((s) => saved.some((x) => x.id === s.id)).map((s) => s.id))) out.push({ id: 'services-order', label: 'Services reordered' });
  return out;
}

function photoChanges(live: Photo[], saved: Photo[]): Change[] {
  const out: Change[] = [];
  const old = new Map(live.map((p) => [p.id, p]));
  const added = saved.filter((p) => !old.has(p.id)).length;
  const removed = live.filter((p) => !saved.some((s) => s.id === p.id)).length;
  if (added) out.push({ id: 'photos-added', label: `${added} ${added === 1 ? 'photo' : 'photos'} added` });
  if (removed) out.push({ id: 'photos-removed', label: `${removed} ${removed === 1 ? 'photo' : 'photos'} removed` });
  const edited = saved.filter((p) => old.has(p.id) && !same({ ...old.get(p.id)!, w: 0 }, { ...p, w: 0 })).length;
  if (edited) out.push({ id: 'photos-edited', label: `${edited} ${edited === 1 ? 'photo' : 'photos'} edited` });
  return out;
}

const SETTING_WORD: Record<string, string> = { name: 'business name', description: 'description', phone: 'phone number', whatsapp: 'WhatsApp number', whatsappSame: 'WhatsApp number', email: 'email', areas: 'areas', hours: 'opening hours', instagram: 'Instagram link', facebook: 'Facebook link' };

/** What the owner has changed since the last publish, in plain words, one entry per thing. */
export function changeList(live: Snapshot, saved: Snapshot): Change[] {
  const out: Change[] = [];
  for (const p of PAGES) { const c = pageChange(p, live.pages[p], saved.pages[p]); if (c) out.push(c); }
  out.push(...serviceChanges(live.services, saved.services), ...photoChanges(live.photos, saved.photos));
  const keys = [...new Set(Object.keys(saved.settings).filter((k) => !same((live.settings as Record<string, unknown>)[k], (saved.settings as Record<string, unknown>)[k])).map((k) => SETTING_WORD[k] ?? k))];
  if (keys.length) out.push({ id: 'settings', label: `Site settings: ${keys.join(', ')} changed` });
  return out;
}

export const pending = (s: SiteState) => changeList(s.live, s.saved);
export const hasChanges = (s: SiteState) => !same(s.live, s.saved);

/** Publishes the saved draft. All or nothing: the live version is replaced in one step and the old one is kept for Undo. */
export function publish(s: SiteState, now = new Date()): SiteState {
  if (!hasChanges(s)) return s;
  return { live: clone(s.saved), saved: clone(s.saved), liveVersion: s.liveVersion + 1, liveAt: now.toISOString(), previous: { snapshot: clone(s.live), version: s.liveVersion, at: s.liveAt } };
}

/**
 * Undo the last publish. It puts the previous live version back and keeps the owner's saved draft, so the changes are
 * waiting in the publish bar again. It only works on the version that was just published (`published`), so a stale
 * Undo can never roll back something published later.
 */
export function undoPublish(s: SiteState, published: number, now = new Date()): SiteState | null {
  if (!s.previous || s.liveVersion !== published) return null;
  return { live: clone(s.previous.snapshot), saved: s.saved, liveVersion: s.liveVersion + 1, liveAt: now.toISOString(), previous: null };
}

/** Throw away saved edits: the draft goes back to exactly what is live. */
export const discard = (s: SiteState): SiteState => ({ ...s, saved: clone(s.live) });
