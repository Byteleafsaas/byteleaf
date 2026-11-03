import { describe, expect, it } from 'vitest';
import { isHex, onBrand, ratio, themeFromBrand } from './contrast';

describe('contrast', () => {
  it('computes the standard black and white ratio', () => {
    expect(ratio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });
  it('byteleaf blue passes with white text', () => {
    const r = onBrand('#166FE5');
    expect(r.text).toBe('#FFFFFF');
    expect(r.passes).toBe(true);
    expect(r.ratio).toBeGreaterThan(4.5);
  });
  it('switches to dark text on a light colour', () => {
    const r = onBrand('#F5A623');
    expect(r.text).toBe('#0B1220');
    expect(r.passes).toBe(true);
  });
  it('reports a colour that neither white nor dark text can read on', () => {
    const r = onBrand('#7A7A7A');
    expect(r.passes).toBe(false);
  });
  it('accepts only six digit hex colours', () => {
    expect(['#166FE5', '#abcdef'].every(isHex)).toBe(true);
    expect(['166FE5', '#16F', '#GGGGGG', ''].some(isHex)).toBe(false);
  });
  it('builds a theme with a soft tint of the brand', () => {
    const t = themeFromBrand('#166FE5');
    expect(t.accent).toBe('#166FE5');
    expect(t.accentSoft).not.toBe(t.accent);
  });
});
