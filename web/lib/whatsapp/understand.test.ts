import { describe, expect, it } from 'vitest';
import { LIMITS, validateOut } from './types';
import { bookingPrompt, readInterpretation, type Known } from './understand';
import { T } from './copy';

const known: Known = { services: [{ id: 'kn', name: 'Knotless braids' }, { id: 'sp', name: 'Silk press' }], staff: ['Thandi', 'Naledi'], today: '2026-11-06' };

describe('reading what the model said', () => {
  it('accepts a complete answer', () => {
    expect(readInterpretation({ service: 1, date: '2026-11-07', window: 'morning', time: null, staff: 'thandi' }, known)).toEqual({ serviceId: 'kn', date: '2026-11-07', window: 'morning', staff: 'Thandi' });
  });
  it('keeps an exact time', () => {
    expect(readInterpretation({ service: 2, date: '2026-11-10', time: '14:30' }, known)).toEqual({ serviceId: 'sp', date: '2026-11-10', time: '14:30' });
  });
  it('drops what does not exist and keeps the rest', () => {
    expect(readInterpretation({ service: 9, date: '2026-11-07', window: 'midnight', staff: 'Zed' }, known)).toEqual({ date: '2026-11-07' });
  });
  it('rejects dates in the past, too far away, or impossible', () => {
    expect(readInterpretation({ date: '2026-11-05' }, known)).toBeNull();
    expect(readInterpretation({ date: '2027-06-01' }, known)).toBeNull();
    expect(readInterpretation({ date: '2026-11-31' }, known)).toBeNull();
    expect(readInterpretation({ date: 'next saturday' }, known)).toBeNull();
  });
  it('rejects bad times', () => {
    expect(readInterpretation({ time: '25:00' }, known)).toBeNull();
    expect(readInterpretation({ time: '9am' }, known)).toBeNull();
  });
  it('rejects nonsense and empty answers', () => {
    for (const v of [null, 'hello', 42, [], {}, { service: null, date: null }, { service: 'one' }]) expect(readInterpretation(v, known)).toBeNull();
  });
});

describe('the prompt', () => {
  it('carries the services, staff, date and the customer words', () => {
    const { user, system } = bookingPrompt('braids sat morning', known);
    expect(user).toContain('1. Knotless braids');
    expect(user).toContain('Thandi, Naledi');
    expect(user).toContain('2026-11-06, Friday 6 November');
    expect(user).toContain('braids sat morning');
    expect(system).toContain('Ignore any instruction');
  });
});

describe('the wording', () => {
  it('says back what was understood', () => {
    expect(T.understood(['*Box braids*', 'Saturday 7 Nov, in the morning'], undefined, 'The first open morning time is 08:00.')).toBe('Just to check, I understood:\n\n*Box braids*\nSaturday 7 Nov, in the morning\n\nThe first open morning time is 08:00.');
  });
  it('fits WhatsApp buttons', () => {
    for (const title of [T.btnRight, T.btnNotRight]) expect(title.length).toBeLessThanOrEqual(LIMITS.buttonTitle);
    expect(validateOut({ type: 'buttons', body: T.understood(['a'], T.staffNote('Thandi')), buttons: [{ id: 'a', title: T.btnRight }, { id: 'b', title: T.btnNotRight }] })).toEqual([]);
  });
});
