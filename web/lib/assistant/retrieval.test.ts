import { describe, expect, it } from 'vitest';
import { DEMO_KNOWLEDGE } from './demo-knowledge';
import { CONTACT_DETAILS, bestSentences, rank } from './retrieval';

const items = DEMO_KNOWLEDGE.filter((k) => (k.status ?? 'live') === 'live' && !k.staffOnly).map((k, i) => ({ id: String(i), title: k.title, text: k.text, sourceName: k.sourceName }));
const top = (q: string) => rank(q, items)[0];

describe('retrieval on the staff-only knowledge', () => {
  const all = DEMO_KNOWLEDGE.map((k, i) => ({ id: String(i), title: k.title, text: k.text, sourceName: k.sourceName }));
  it.each([
    ['What do I check before switching on a new battery install?', 'Battery commissioning checks'],
    ['How do I log a warranty claim?', 'Logging a warranty claim'],
    ['How much discount can I give?', 'Discount limits'],
  ])('%s -> %s', (q, title) => {
    const best = rank(q, all)[0];
    expect(best.item.title).toBe(title);
    expect(best.coverage).toBeGreaterThanOrEqual(0.55);
  });
});

describe('retrieval on the demo knowledge', () => {
  it.each([
    ['Do you install batteries as well as panels?', 'What we install'],
    ['How much does an essential system cost?', 'Essential package price'],
    ['What warranty do I get?', 'Warranty periods'],
    ['Can I pay it off monthly?', 'Paying monthly'],
    ['Which areas do you cover?', 'Where we work'],
    ['How long does installation take?', 'How installation works'],
    ['Do you do a free assessment?', 'Free site assessment'],
  ])('%s -> %s', (q, title) => {
    const best = top(q);
    expect(best.item.title).toBe(title);
    expect(best.coverage).toBeGreaterThanOrEqual(0.55);
  });

  it.each(['Do you do solar for caravans?', 'Can you fix my pool pump?', 'What is the capital of France?'])('stays below the answer threshold for: %s', (q) => {
    const best = top(q);
    expect(best?.coverage ?? 0).toBeLessThan(0.55);
  });

  it('puts the package prices in the top three for a price question', () => {
    const titles = rank('How much does a home system cost?', items).slice(0, 3).map((r) => r.item.title);
    expect(titles).toEqual(expect.arrayContaining(['Essential package price']));
  });

  it('does not answer a family question from the essential package alone', () => {
    const without = items.filter((i) => i.title !== 'Family package from the website');
    expect(rank('How much is the family package?', without)[0]?.coverage ?? 0).toBeLessThan(0.55);
  });

  it('quotes the sentence that matches the question', () => {
    const t = items.find((i) => i.title === 'How installation works')!.text;
    expect(bestSentences('how long does it take', t, 1)).toMatch(/one to two days/);
  });

  it('spots contact details typed into the chat', () => {
    expect(CONTACT_DETAILS.test('call me on 082 555 0123')).toBe(true);
    expect(CONTACT_DETAILS.test('my email is lindiwe@example.co.za')).toBe(true);
    expect(CONTACT_DETAILS.test('a 5 kWh battery for R 68 500')).toBe(false);
  });
});
