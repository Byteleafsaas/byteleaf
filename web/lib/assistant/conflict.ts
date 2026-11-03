// Spots two knowledge items that talk about the same thing but give different amounts (for example two prices
// for the same package). The assistant must not quote either until the owner picks one. Pure, so it is testable.
import { tokens } from './retrieval';

/** Rand amounts found in a text, as whole numbers: "R 112 000", "R112,000", "R39 900.50" -> 112000, 112000, 39900. */
export function amounts(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\bR\s?(\d{1,3}(?:[ , ]\d{3})+|\d+)(?:[.,]\d{1,2})?/g)) {
    const n = Number(m[1].replace(/[ , ]/g, ''));
    if (Number.isFinite(n) && n >= 100) out.push(n);
  }
  return out;
}

const generic = new Set(['package', 'price', 'cost', 'installed', 'install', 'include', 'includ', 'solar', 'home']);

/** True when the two items cover the same topic with clearly different amounts. */
export function conflicts(a: { title: string; text: string }, b: { title: string; text: string }): boolean {
  const pa = amounts(a.text);
  const pb = amounts(b.text);
  if (!pa.length || !pb.length) return false;
  // Same topic: the titles share a distinctive word (e.g. 'family'). Two packages share many other words, so text alone isn't enough.
  const titleShared = tokens(a.title).filter((t) => tokens(b.title).includes(t) && !generic.has(t));
  if (titleShared.length < 1) return false;
  // Different: none of one item's amounts appears in the other.
  return !pa.some((n) => pb.includes(n));
}
