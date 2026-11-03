// Colour maths for the widget's brand colour: pick readable text for it and check it passes WCAG AA.
import type { Theme } from './workspaces';

export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v.trim());

const channel = (n: number) => {
  const c = n / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = '#FFFFFF';
const DARK = '#0B1220';
export const AA = 4.5;

/** Which text colour works on the brand colour, if any. Prefers white. */
export function onBrand(brand: string): { text: string; ratio: number; passes: boolean } {
  const w = ratio(brand, WHITE);
  if (w >= AA) return { text: WHITE, ratio: w, passes: true };
  const d = ratio(brand, DARK);
  return { text: DARK, ratio: d, passes: d >= AA };
}

const mix = (hex: string, withHex: string, amount: number) => {
  const a = hex.replace('#', '');
  const b = withHex.replace('#', '');
  const out = [0, 2, 4].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - amount) + parseInt(b.slice(i, i + 2), 16) * amount));
  return `#${out.map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

/** The widget's colours for a brand colour: accent and a soft tint of it, on the standard light neutrals. */
export function themeFromBrand(brand: string): Theme {
  const accent = brand.toUpperCase();
  return {
    accent, onAccent: onBrand(accent).text, accentSoft: mix(accent, WHITE, 0.9), surface: '#FFFFFF', text: DARK, muted: '#4B5872', border: '#E3E9F2', bubble: '#F2F5F9',
  };
}
