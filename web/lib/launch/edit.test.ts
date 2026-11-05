import { describe, expect, it } from 'vitest';
import { defaultPages } from './defaults';
import { applyPageEdit } from './edit';

const home = () => defaultPages().home;

describe('applying a page edit', () => {
  it('changes the value inside a block and nothing else', () => {
    const r = applyPageEdit(home(), [{ id: 'h1', value: 'Washed where you park.' }, { id: 'h5', on: false }], ['p1']);
    if (!r.ok) throw new Error(r.error);
    expect(r.blocks.find((b) => b.id === 'h1')).toMatchObject({ value: 'Washed where you park.', max: 60, label: 'Headline' });
    expect(r.blocks.find((b) => b.id === 'h5')).toMatchObject({ on: false });
    expect(r.blocks.map((b) => b.id)).toEqual(home().map((b) => b.id));
  });

  it('cannot add, remove, reorder or retype blocks, or change a limit', () => {
    const r = applyPageEdit(home(), [{ id: 'h1', value: 'Ok' }, { id: 'zz', value: 'new block' }, { id: 'h2', type: 'heading', max: 9999 } as never], ['p1']);
    if (!r.ok) throw new Error(r.error);
    expect(r.blocks).toHaveLength(home().length);
    expect(r.blocks.find((b) => b.id === 'h2')).toMatchObject({ type: 'text', max: 220 });
  });

  it('refuses a heading that is empty or too long, saying which block', () => {
    expect(applyPageEdit(home(), [{ id: 'h1', value: '' }], [])).toEqual({ ok: false, error: 'Headline: Add a heading.' });
    const long = applyPageEdit(home(), [{ id: 'h1', value: 'x'.repeat(61) }], []);
    expect(long.ok).toBe(false);
  });

  it('only accepts the button targets we have', () => {
    const r = applyPageEdit(home(), [{ id: 'h3', value: 'Book now', target: 'whatsapp' }], []);
    if (!r.ok) throw new Error(r.error);
    expect(r.blocks.find((b) => b.id === 'h3')).toMatchObject({ value: 'Book now', target: 'whatsapp' });
    const bad = applyPageEdit(home(), [{ id: 'h3', value: 'Book now', target: 'javascript:alert(1)' }], []);
    if (!bad.ok) throw new Error(bad.error);
    expect(bad.blocks.find((b) => b.id === 'h3')).toMatchObject({ target: 'contact' }); // keeps what it had
  });

  it('only accepts a photo that exists, or none', () => {
    expect(applyPageEdit(home(), [{ id: 'h4', value: 'nope' }], ['p1'])).toEqual({ ok: false, error: 'That photo no longer exists.' });
    const none = applyPageEdit(home(), [{ id: 'h4', value: '' }], ['p1']);
    if (!none.ok) throw new Error(none.error);
    expect(none.blocks.find((b) => b.id === 'h4')).toMatchObject({ value: '' });
  });

  it('rejects something that is not a list of edits', () => {
    expect(applyPageEdit(home(), 'hello', []).ok).toBe(false);
    expect(applyPageEdit(home(), null, []).ok).toBe(false);
  });
});
