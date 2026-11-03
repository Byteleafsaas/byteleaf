import { describe, expect, it } from 'vitest';
import { isDue } from './reminders';

const at = (s: string) => new Date(`${s}:00Z`);
const base = { startsAt: at('2026-11-07T08:00'), createdAt: at('2026-11-01T10:00'), hours: 24, sent: [] as string[] };

describe('isDue', () => {
  it('is not due before the reminder window opens', () => {
    expect(isDue({ ...base, now: at('2026-11-06T07:00') })).toBe(false); // 25 hours before
  });
  it('is due once inside the window, until the appointment starts', () => {
    expect(isDue({ ...base, now: at('2026-11-06T08:00') })).toBe(true); // exactly 24 hours before
    expect(isDue({ ...base, now: at('2026-11-06T20:00') })).toBe(true);
    expect(isDue({ ...base, now: at('2026-11-07T08:00') })).toBe(false); // started
    expect(isDue({ ...base, now: at('2026-11-07T09:00') })).toBe(false); // over
  });
  it('is only sent once', () => {
    expect(isDue({ ...base, now: at('2026-11-06T20:00'), sent: ['24h'] })).toBe(false);
    expect(isDue({ ...base, now: at('2026-11-06T20:00'), sent: ['2h'] })).toBe(true); // a different reminder
  });
  it('skips a reminder for a booking made inside its window', () => {
    // booked 3 hours before: no "24 hours" reminder, but the 2 hour one still applies
    const late = { ...base, createdAt: at('2026-11-07T05:00') };
    expect(isDue({ ...late, now: at('2026-11-07T05:30') })).toBe(false);
    expect(isDue({ ...late, now: at('2026-11-07T06:00'), hours: 2 })).toBe(true);
  });
});
