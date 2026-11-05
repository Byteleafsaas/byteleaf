import { describe, expect, it } from 'vitest';
import { D, FORM } from './content';
import { BASE, R } from './routes';
import { SC } from './showcase';
import { css } from './css';

describe('law firm content', () => {
  it('gives every practice area and guide its own route under the sample site', () => {
    const slugs = [...D.areas.map((a) => a.slug), ...D.guides.map((g) => g.slug)];
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of D.areas) expect(a.href).toBe(R.area(a.slug));
    for (const g of D.guides) expect(g.href).toBe(R.guide(g.slug));
    expect(D.areas.every((a) => a.href.startsWith(BASE))).toBe(true);
  });

  it('keeps unconfirmed amounts in square brackets, never as invented numbers', () => {
    for (const r of [...D.rates, ...D.charge, ...D.flCost]) expect(r.p).not.toMatch(/R\s?\d/);
  });

  it('tags every client quote as a sample and keeps the emergency numbers', () => {
    expect(D.words.every((w) => w.w.startsWith('Sample client'))).toBe(true);
    expect(FORM.sent.demoNote).toContain('Nothing was sent');
    expect(D.areas.length).toBe(6);
    expect(SC.order.length).toBe(7);
  });

  it('turns reference style strings into style objects', () => {
    expect(css('font-size: 1rem; --cols: 1fr 2fr; padding-block: 6px')).toEqual({ fontSize: '1rem', '--cols': '1fr 2fr', paddingBlock: '6px' });
  });
});
