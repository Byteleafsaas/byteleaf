import { describe, expect, it } from 'vitest';
import { defaultSnapshot } from './defaults';
import { addPhoto, homeServices, movePhoto, needsAlt, photoUsedOn, removePhoto, removeService, reorderServices, updatePhoto, upsertService } from './ops';

const snap = defaultSnapshot;
const homeImage = (s: ReturnType<typeof snap>) => s.pages.home.find((b) => b.type === 'image')!.type === 'image' ? (s.pages.home.find((b) => b.type === 'image') as { value: string }).value : '';

describe('services', () => {
  const input = { name: 'Fleet visit', price: null, time: '3 hours', included: ['  A quote first  ', '', 'One visit'], visible: true };

  it('adds a service with no fixed price and tidies the included lines', () => {
    const r = upsertService(snap(), input);
    if (!r.ok) throw new Error(r.error);
    const added = r.snapshot.services.at(-1)!;
    expect(added).toMatchObject({ name: 'Fleet visit', price: null, included: ['A quote first', 'One visit'] });
    expect(r.snapshot.services).toHaveLength(5);
  });

  it('changes an existing service in place', () => {
    const r = upsertService(snap(), { ...input, id: 'sv2', name: 'Full wash and vacuum', price: 270 });
    if (!r.ok) throw new Error(r.error);
    expect(r.snapshot.services[1]).toMatchObject({ id: 'sv2', price: 270 });
    expect(r.snapshot.services).toHaveLength(4);
  });

  it('says what is wrong instead of saving', () => {
    expect(upsertService(snap(), { ...input, name: '' })).toEqual({ ok: false, error: 'Give the service a name.' });
    expect(upsertService(snap(), { ...input, price: undefined }).ok).toBe(false);
    expect(upsertService(snap(), { ...input, included: Array.from({ length: 7 }, (_, i) => `Item ${i}`) }).ok).toBe(false);
    expect(upsertService(snap(), { ...input, id: 'gone' })).toEqual({ ok: false, error: 'That service no longer exists.' });
  });

  it('reorders only with exactly the same services', () => {
    const ids = snap().services.map((s) => s.id).reverse();
    expect(reorderServices(snap(), ids)?.services.map((s) => s.id)).toEqual(ids);
    expect(reorderServices(snap(), ids.slice(1))).toBeNull();
    expect(reorderServices(snap(), [...ids.slice(1), 'sv1', 'sv1'].slice(0, 4))).toBeNull();
  });

  it('removes a service, and the Home page shows the first six that are switched on', () => {
    expect(removeService(snap(), 'sv1')?.services).toHaveLength(3);
    expect(removeService(snap(), 'nope')).toBeNull();
    const many = Array.from({ length: 9 }, (_, i) => ({ ...snap().services[0], id: `m${i}`, visible: i !== 1 }));
    expect(homeServices(many).map((s) => s.id)).toEqual(['m0', 'm2', 'm3', 'm4', 'm5', 'm6']);
  });
});

describe('photos', () => {
  it('starts an upload in the gallery, with no description yet', () => {
    const { snapshot, id } = addPhoto(snap(), { key: 'projects/x.jpg', w: 2000 });
    const p = snapshot.photos.find((x) => x.id === id)!;
    expect(p).toMatchObject({ kind: 'upload', on: { home: false, about: false, gallery: true }, alt: '' });
    expect(needsAlt(snapshot.photos)).toEqual([p]);
  });

  it('lets only one photo be the Home photo: choosing a new one moves it, and the Home page follows', () => {
    const { snapshot, id } = addPhoto(snap(), { key: 'projects/x.jpg', w: 2400, alt: 'The van' });
    expect(homeImage(snapshot)).toBe('p1');
    const moved = updatePhoto(snapshot, id, { on: { home: true } })!;
    expect(moved.photos.filter((p) => p.on.home).map((p) => p.id)).toEqual([id]);
    expect(homeImage(moved)).toBe(id);
  });

  it('turning the Home photo off falls back to the prices card', () => {
    const off = updatePhoto(snap(), 'p1', { on: { home: false } })!;
    expect(homeImage(off)).toBe('');
  });

  it('edits the description, and moves a photo up or down', () => {
    expect(updatePhoto(snap(), 'p2', { alt: ' A hatchback ' })!.photos[1].alt).toBe('A hatchback');
    expect(updatePhoto(snap(), 'nope', {})).toBeNull();
    expect(movePhoto(snap(), 'p2', 1)!.photos.map((p) => p.id).slice(0, 3)).toEqual(['p1', 'p3', 'p2']);
    expect(movePhoto(snap(), 'p1', -1)).toBeNull();
    expect(movePhoto(snap(), 'p7', 1)).toBeNull();
  });

  it('says which pages lose a photo, and removing the Home photo clears it from the page', () => {
    expect(photoUsedOn(snap(), 'p1')).toEqual(['home']);
    expect(photoUsedOn(snap(), 'p3')).toEqual(['gallery']);
    const r = removePhoto(snap(), 'p1')!;
    expect(r.photos.some((p) => p.id === 'p1')).toBe(false);
    expect(homeImage(r)).toBe('');
    expect(removePhoto(snap(), 'nope')).toBeNull();
  });
});
