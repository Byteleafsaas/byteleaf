import { describe, expect, it } from 'vitest';
import { KIND, isDue, reminderAt } from './reminders';

const at = (s: string) => new Date(`${s}:00Z`);
// Saturday 7 Nov, 08:00 in Johannesburg (06:00 UTC). The reminder is Friday 18:00 there, which is 16:00 UTC.
const base = { date: '2026-11-07', startsAt: at('2026-11-07T06:00'), createdAt: at('2026-11-01T08:00'), hour: 18, sent: [] as string[] };

describe('the day-before reminder', () => {
  it('is set for 18:00 South African time the evening before', () => {
    expect(reminderAt('2026-11-07', 18).toISOString()).toBe('2026-11-06T16:00:00.000Z');
    expect(reminderAt('2026-11-01', 9).toISOString()).toBe('2026-10-31T07:00:00.000Z'); // crosses a month end
    expect(reminderAt('2026-11-07', 20).toISOString()).toBe('2026-11-06T18:00:00.000Z'); // the owner can change the hour
  });

  it('is not due before that hour', () => {
    expect(isDue({ ...base, now: at('2026-11-06T15:59') })).toBe(false);
    expect(isDue({ ...base, now: at('2026-11-06T08:00') })).toBe(false); // 24 hours before is not the rule any more
  });

  it('is due from that hour until the appointment starts', () => {
    expect(isDue({ ...base, now: at('2026-11-06T16:00') })).toBe(true);
    expect(isDue({ ...base, now: at('2026-11-06T22:00') })).toBe(true); // a late scheduler run still sends it
    expect(isDue({ ...base, now: at('2026-11-07T06:00') })).toBe(false); // started
    expect(isDue({ ...base, now: at('2026-11-07T07:00') })).toBe(false); // over
  });

  it('is only sent once', () => {
    expect(isDue({ ...base, now: at('2026-11-06T17:00'), sent: [KIND] })).toBe(false);
    expect(isDue({ ...base, now: at('2026-11-06T17:00'), sent: ['24h'] })).toBe(true); // an old-style entry doesn't count
  });

  it('skips a booking made after the reminder hour, since the client has only just heard from us', () => {
    const late = { ...base, createdAt: at('2026-11-06T17:00') };
    expect(isDue({ ...late, now: at('2026-11-06T17:30') })).toBe(false);
    const early = { ...base, createdAt: at('2026-11-06T15:59') };
    expect(isDue({ ...early, now: at('2026-11-06T16:00') })).toBe(true);
  });
});
