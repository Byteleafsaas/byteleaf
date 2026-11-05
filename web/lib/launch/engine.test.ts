import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { changeList, clone, discard, hasChanges, pending, publish, undoPublish } from './engine';
import type { SiteState } from './types';

const fresh = (): SiteState => defaultState(new Date('2026-11-05T10:00:00Z'));
const edit = (s: SiteState, fn: (x: SiteState['saved']) => void): SiteState => { const n = clone(s); fn(n.saved); return n; };

describe('what is waiting to be published', () => {
  it('starts with nothing: a new site is fully live', () => {
    expect(hasChanges(fresh())).toBe(false);
    expect(pending(fresh())).toEqual([]);
  });

  it('names a price change in plain words, with both prices', () => {
    const s = edit(fresh(), (d) => { d.services.find((x) => x.id === 'sv2')!.price = 270; });
    expect(pending(s)).toEqual([{ id: 'service-sv2', label: 'Full wash and vacuum: price R 250 → R 270' }]);
  });

  it('keeps one entry per thing, however many fields changed', () => {
    const s = edit(fresh(), (d) => { const x = d.services[0]; x.price = null; x.time = '1 hour'; x.visible = false; });
    const list = pending(s);
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe('Express wash: price R 120 → Ask for a price, time 45 minutes → 1 hour, hidden from the site');
  });

  it('describes added, removed and reordered services', () => {
    const s = edit(fresh(), (d) => {
      d.services.push({ id: 'sv9', name: 'Fleet visit', price: null, time: '3 hours', summary: '', included: [], visible: true });
      d.services = d.services.filter((x) => x.id !== 'sv4');
      [d.services[0], d.services[1]] = [d.services[1], d.services[0]];
    });
    const labels = pending(s).map((c) => c.label);
    expect(labels).toContain('Fleet visit added');
    expect(labels).toContain('Polish and wax removed');
    expect(labels).toContain('Services reordered');
  });

  it('names the page and the blocks that were edited', () => {
    const s = edit(fresh(), (d) => { const b = d.pages.home[0]; if (b.type === 'heading') b.value = 'Washed where you park.'; const t = d.pages.home[1]; if (t.type === 'text') t.value = 'Short.'; });
    expect(pending(s)).toEqual([{ id: 'page-home', label: 'Home page: headline, intro edited' }]);
  });

  it('counts photos and groups site settings', () => {
    const s = edit(fresh(), (d) => {
      d.photos.push({ id: 'n1', kind: 'upload', key: 'a', alt: '', w: 2000, on: { home: false, about: false, gallery: true }, caption: '' });
      d.photos.push({ id: 'n2', kind: 'upload', key: 'b', alt: '', w: 2000, on: { home: false, about: false, gallery: true }, caption: '' });
      d.photos = d.photos.filter((p) => p.id !== 'p7');
      d.settings.phone = '082 123 4567';
      d.settings.hours.saturday = '08:00–13:00';
    });
    const labels = pending(s).map((c) => c.label);
    expect(labels).toContain('2 photos added');
    expect(labels).toContain('1 photo removed');
    expect(labels).toContain('Site settings: phone number, opening hours changed');
  });
});

describe('publishing', () => {
  const draft = () => edit(fresh(), (d) => { d.services[1].price = 270; });

  it('does nothing when there is nothing to publish', () => {
    const s = fresh();
    expect(publish(s)).toBe(s);
  });

  it('makes the saved draft live in one step and bumps the version', () => {
    const s = publish(draft(), new Date('2026-11-05T12:00:00Z'));
    expect(s.live.services[1].price).toBe(270);
    expect(s.liveVersion).toBe(2);
    expect(s.liveAt).toBe('2026-11-05T12:00:00.000Z');
    expect(hasChanges(s)).toBe(false);
  });

  it('keeps the old live version for Undo, untouched', () => {
    const before = fresh();
    const s = publish(draft());
    expect(s.previous?.snapshot).toEqual(before.live);
    expect(s.previous?.version).toBe(1);
  });

  it('does not share objects between live and saved, so a later edit cannot leak into the live site', () => {
    const s = publish(draft());
    s.saved.services[1].price = 999;
    expect(s.live.services[1].price).toBe(270);
  });
});

describe('undo', () => {
  const published = () => publish(edit(fresh(), (d) => { d.services[1].price = 270; }));

  it('puts the previous live version back and returns the changes to the publish bar', () => {
    const s = published();
    const u = undoPublish(s, s.liveVersion)!;
    expect(u.live.services[1].price).toBe(250);
    expect(u.saved.services[1].price).toBe(270);
    expect(pending(u).map((c) => c.label)).toEqual(['Full wash and vacuum: price R 250 → R 270']);
    expect(u.previous).toBeNull();
  });

  it('only undoes the publish that was just made', () => {
    const s = published();
    expect(undoPublish(s, s.liveVersion - 1)).toBeNull();
    const later = publish(edit(s, (d) => { d.services[0].price = 130; }));
    expect(undoPublish(later, s.liveVersion)).toBeNull(); // a stale Undo can't roll back a newer publish
  });

  it('cannot be done twice', () => {
    const s = published();
    const u = undoPublish(s, s.liveVersion)!;
    expect(undoPublish(u, s.liveVersion)).toBeNull();
    expect(undoPublish(fresh(), 1)).toBeNull();
  });
});

describe('discarding', () => {
  it('resets the draft to exactly what is live and leaves the live site alone', () => {
    const s = edit(fresh(), (d) => { d.services[0].price = 1; d.settings.name = 'X'; });
    const d = discard(s);
    expect(hasChanges(d)).toBe(false);
    expect(d.live).toEqual(s.live);
    expect(changeList(d.live, d.saved)).toEqual([]);
  });
});
