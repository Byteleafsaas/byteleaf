// Only these change per client in the booking admin: the five accent tokens, the logo mark and the business name (HANDOFF-WHATSAPP §7).
export type BrandKey = 'byteleaf' | 'plum' | 'teal' | 'tsela' | 'spark';
export type Brand = { acc: string; h: string; t: string; soft: string; ring: string };

export const BRANDS: Record<BrandKey, Brand> = {
  byteleaf: { acc: '#166FE5', h: '#0F5FCC', t: '#0F5FCC', soft: '#EEF4FE', ring: 'rgba(22,111,229,.2)' },
  plum: { acc: '#8B2F7E', h: '#74256A', t: '#7A2470', soft: '#F7ECF5', ring: 'rgba(139,47,126,.2)' },
  teal: { acc: '#0E7A6D', h: '#0B6458', t: '#0B6458', soft: '#E7F4F2', ring: 'rgba(14,122,109,.22)' },
  // The launch-website admin (HANDOFF-LAUNCH §6): Tsela's green, and a sample second client in orange.
  tsela: { acc: '#1D6B47', h: '#175A3B', t: '#175A3B', soft: '#E8F3EC', ring: 'rgba(29,107,71,.2)' },
  spark: { acc: '#C2410C', h: '#A3360A', t: '#A3360A', soft: '#FDF0E8', ring: 'rgba(194,65,12,.2)' },
};

export const brandKey = (k: string | null | undefined): BrandKey => (k === 'plum' || k === 'teal' || k === 'tsela' || k === 'spark' ? k : 'byteleaf');

/** The CSS variables to put on the admin root element. */
export const brandVars = (k: string | null | undefined): Record<string, string> => {
  const b = BRANDS[brandKey(k)];
  return { '--acc': b.acc, '--acc-h': b.h, '--acc-t': b.t, '--acc-soft': b.soft, '--acc-ring': b.ring };
};

/** Relative luminance contrast of white text on a colour. A client's accent must reach 4.5:1 (§7). */
export function whiteContrast(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return 1.05 / (l + 0.05);
}
