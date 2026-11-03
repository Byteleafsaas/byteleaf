// Finds which knowledge items are relevant to a question. Pure functions, no database, so they are easy to test.

const STOP = new Set(
  'a an the and or but of in on at to for from with without by as is are was were be been am do does did done can could would should will shall may might must have has had it its this that these those i me my we our you your they them their he she his her what which who whom whose when where why how there here so if than then too very just also about into over under up down out off not no yes get got any some please tell know like want need well much many more most long give new'.split(' '),
);

// Words people use for the same thing, folded to one form before matching.
const ALIASES: Record<string, string> = {
  cost: 'price', costs: 'price', pricing: 'price', prices: 'price', expensive: 'price', cheap: 'price', pay: 'price',
  guarantee: 'warranty', guarantees: 'warranty', warranties: 'warranty', covered: 'warranty',
  battery: 'battery', batteries: 'battery', storage: 'battery',
  panel: 'panel', panels: 'panel', pv: 'panel',
  monthly: 'finance', instalment: 'finance', installment: 'finance', instalments: 'finance', installments: 'finance', financing: 'finance', loan: 'finance',
  joburg: 'johannesburg', jozi: 'johannesburg',
  switch: 'commission', switching: 'commission', energise: 'commission', energize: 'commission', commissioning: 'commission', activate: 'commission',
  checklist: 'check', checks: 'check', checking: 'check', inspect: 'check',
};

// The words the aliases fold into are the topics a business is asked about most (price, warranty, finance...).
const TOPIC = new Set(Object.values(ALIASES));

export function stem(word: string): string {
  const w = ALIASES[word] ?? word;
  if (w.length <= 4) return w;
  if (w.endsWith('ing') && w.length > 6) return w.slice(0, -3);
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 5) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.endsWith('ed') && w.length > 5) return w.slice(0, -2);
  return w;
}

export function tokens(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  return words.filter((w) => !STOP.has(w)).map(stem).filter((w) => w.length > 1);
}

export type Candidate = { id: string; title: string; text: string; sourceName: string };
export type Ranked<T extends Candidate> = { item: T; score: number; coverage: number };

/**
 * Ranks items by how well they cover the question's meaningful words, weighting rare words more.
 * `coverage` is the share of the question's weight that the best item accounts for (0 to 1). A word nobody
 * has ever written about ("caravan") counts against every item, so unrelated questions score low even when
 * they share a common word like the business name.
 */
export function rank<T extends Candidate>(question: string, items: T[]): Ranked<T>[] {
  const q = [...new Set(tokens(question))];
  if (!q.length || !items.length) return [];
  const docs = items.map((it) => ({ it, title: new Set(tokens(it.title)), set: new Set(tokens(`${it.title} ${it.sourceName} ${it.text}`)) }));
  const n = docs.length;
  const weight = (t: string) => {
    const df = docs.filter((d) => d.set.has(t)).length;
    // A topic word (price, warranty...) says what the question is about, so it outweighs a word like 'home'.
    return Math.log(1 + (n - df + 0.5) / (df + 0.5)) * (TOPIC.has(t) ? 3 : 1);
  };
  const weights = new Map(q.map((t) => [t, weight(t)]));
  const total = [...weights.values()].reduce((a, b) => a + b, 0) || 1;
  return docs
    .map(({ it, set, title }) => {
      // Coverage is plain: how much of the question this item accounts for. The title bonus only orders the results,
      // so a generic word in a title can't make a partial match look like a full one.
      const base = q.reduce((sum, t) => sum + (set.has(t) ? weights.get(t)! : 0), 0);
      const bonus = q.reduce((sum, t) => sum + (set.has(t) && title.has(t) ? weights.get(t)! * 0.5 : 0), 0);
      return { item: it, score: base + bonus, coverage: Math.min(1, base / total) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** The sentences of a passage that best match the question, in their original order. */
export function bestSentences(question: string, text: string, max = 2): string {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  if (sentences.length <= max) return sentences.join(' ');
  const q = new Set(tokens(question));
  const scored = sentences.map((s, i) => ({ s, i, score: tokens(s).filter((t) => q.has(t)).length }));
  const keep = [...scored].sort((a, b) => b.score - a.score || a.i - b.i).slice(0, max).sort((a, b) => a.i - b.i);
  return keep.map((k) => k.s).join(' ');
}

export const CONTACT_DETAILS = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(\+?\d[\d\s().-]{7,}\d)/i;

export function normaliseQuestion(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
