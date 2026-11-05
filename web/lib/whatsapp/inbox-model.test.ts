import { describe, expect, it } from 'vitest';
import { canReply, chatStatus, preview, whoLabel, windowState } from './inbox-model';

const at = (s: string) => new Date(`${s}:00Z`);

describe('the reply window', () => {
  const now = at('2026-11-05T12:00');
  it('counts the hours left in the 24-hour window', () => {
    expect(windowState(at('2026-11-05T11:30'), now)).toMatchObject({ open: true, hoursLeft: 24, label: 'REPLY WINDOW · 24 H LEFT' });
    expect(windowState(at('2026-11-04T13:00'), now)).toMatchObject({ open: true, hoursLeft: 1, label: 'REPLY WINDOW · 1 H LEFT' });
  });
  it('is closed after 24 hours or when they never wrote, and says a template can be sent (a neutral chip, not an error)', () => {
    expect(windowState(at('2026-11-04T12:00'), now)).toEqual({ open: false, hoursLeft: 0, label: 'Window closed · you can send a template' });
    expect(windowState(null, now).open).toBe(false);
  });
});

describe('who has the chat', () => {
  it('is the assistant until a person is asked for, then flagged, then taken', () => {
    expect(chatStatus({ step: 'menu' }, false)).toBe('assistant');
    expect(chatStatus({ step: 'handover' }, true)).toBe('asked');
    expect(chatStatus({ step: 'handover' }, false)).toBe('taken');
    expect(chatStatus(null, false)).toBe('assistant');
  });
  it('lets the owner type only after taking over, and only inside the window', () => {
    expect(canReply('taken', true)).toBe(true);
    expect(canReply('taken', false)).toBe(false);
    expect(canReply('asked', true)).toBe(false);
    expect(canReply('assistant', true)).toBe(false);
  });
});

describe('labels', () => {
  it('labels every message as Assistant, You (name) or the client', () => {
    expect(whoLabel({ from: 'client' }, 'Lindiwe')).toBe('Lindiwe');
    expect(whoLabel({ from: 'assistant' }, 'Lindiwe')).toBe('Assistant');
    expect(whoLabel({ from: 'staff', by: 'Lerato' }, 'Lindiwe')).toBe('You (Lerato)');
    expect(whoLabel({ dir: 'in' }, 'Lindiwe')).toBe('Lindiwe'); // older messages without a `from`
    expect(whoLabel({ dir: 'out' }, 'Lindiwe')).toBe('Assistant');
  });
  it('shortens a preview without cutting mid-line', () => {
    expect(preview('short')).toBe('short');
    expect(preview('x'.repeat(100)).length).toBe(60);
    expect(preview('a\n\nb')).toBe('a b');
  });
});
