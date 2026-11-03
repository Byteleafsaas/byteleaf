import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, refusedPattern, settingsSchema, topicStem } from './settings';

describe('topicStem', () => {
  it.each([['Discounts', 'discount'], ['Legal advice', 'legal'], ['Electrical fault diagnosis', 'diagnos'], ['Competitor pricing', 'competitor']])('%s -> %s', (t, s) => {
    expect(topicStem(t)).toBe(s);
  });
});

describe('refusedPattern', () => {
  const re = refusedPattern(DEFAULT_SETTINGS.khumalo.refused);
  it.each(['Can I get a discount?', 'any discounts for pensioners', 'is my contract legal', 'my inverter has a fault, can you diagnose it', 'are you cheaper than a competitor', 'can you help with my tax return'])('refuses: %s', (q) => {
    expect(re.test(q)).toBe(true);
  });
  it.each(['How much is the family package?', 'Do you install batteries?', 'What is my electrical board for?', 'Do you give advice on roof types?'])('does not refuse: %s', (q) => {
    expect(re.test(q)).toBe(false);
  });
  it('picks up a topic the owner adds', () => {
    expect(refusedPattern(['Warranty claims']).test('I want to make a warranty claim')).toBe(true);
  });
});

describe('settingsSchema', () => {
  it('accepts the defaults', () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS.khumalo).success).toBe(true);
  });
  it('rejects a bad colour and a long greeting', () => {
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS.khumalo, brand: 'blue' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS.khumalo, greeting: 'x'.repeat(161) }).success).toBe(false);
  });
});
