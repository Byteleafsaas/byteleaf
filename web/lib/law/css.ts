import type { CSSProperties } from 'react';

/** Turns the reference pages' inline style strings into style objects, so the markup can be ported as written. */
export function css(text: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const part of text.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (!k) continue;
    out[k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  }
  return out as CSSProperties;
}
