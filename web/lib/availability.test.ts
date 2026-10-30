import { describe, expect, it } from 'vitest';
import { computeAvailability, isSlotFree } from './availability';
import type { Settings } from './admin/types';

const A: Settings['availability'] = {
  workingDays: [1, 2, 3, 4, 5],
  startTimes: ['09:00', '10:00', '11:30', '13:00'],
  meetingTypes: [
    { key: 'discovery', name: 'Discovery call', where: 'Video call', enabled: true, minutes: 30 },
    { key: 'deep-dive', name: 'Technical deep-dive', where: 'Video call', enabled: true, minutes: 60 },
    { key: 'in-person', name: 'In-person meeting', where: 'Johannesburg', enabled: false, minutes: 60 },
  ],
  minNotice: 'Next working day',
  bufferMin: '15 min',
  maxPerDay: 2,
  blocked: [{ from: '2026-11-09', to: '2026-11-10' }],
};
// Friday 30 Oct 2026, 10:00 SAST
const NOW = new Date('2026-10-30T08:00:00Z');

describe('computeAvailability', () => {
  it('skips weekends, blocked dates and today (next working day notice)', () => {
    const m = computeAvailability(A, [], { now: NOW, days: 14 });
    expect(m['2026-10-30']).toBeUndefined(); // today
    expect(m['2026-10-31']).toBeUndefined(); // Saturday
    expect(m['2026-11-01']).toBeUndefined(); // Sunday
    expect(m['2026-11-02']).toBeDefined(); // Monday
    expect(m['2026-11-09']).toBeUndefined(); // blocked
  });

  it('only offers enabled meeting types', () => {
    const day = computeAvailability(A, [], { now: NOW, days: 7 })['2026-11-02'];
    expect(Object.keys(day)).toEqual(['discovery', 'deep-dive']);
  });

  it('removes slots that overlap a booking including the break between meetings', () => {
    // 10:00–10:30 booked + 15 min break: 09:00 (30 min, ends 09:30) is fine; 11:30 is fine; 10:00 gone.
    const day = computeAvailability(A, [{ date: '2026-11-02', time: '10:00', durationMin: 30 }], { now: NOW, days: 7 })['2026-11-02'];
    expect(day.discovery).toEqual(['09:00', '11:30', '13:00']);
    // a 60 min call at 09:00 would end 10:00 and touch the break, so it is not offered
    expect(day['deep-dive']).toEqual(['11:30', '13:00']);
  });

  it('closes a day once max meetings per day is reached', () => {
    const active = [{ date: '2026-11-02', time: '09:00', durationMin: 30 }, { date: '2026-11-02', time: '13:00', durationMin: 30 }];
    expect(computeAvailability(A, active, { now: NOW, days: 7 })['2026-11-02']).toBeUndefined();
  });

  it('honours a 48 hour notice window', () => {
    const m = computeAvailability({ ...A, minNotice: '48 hours' }, [], { now: NOW, days: 7 });
    expect(m['2026-11-02']).toBeDefined(); // Monday 09:00 is > 48h away from Fri 10:00
    expect(m['2026-11-02']!.discovery).toContain('09:00');
  });
});

describe('isSlotFree', () => {
  it('re-checks a single slot', () => {
    expect(isSlotFree(A, [], 'discovery', '2026-11-02', '09:00', NOW)).toBe(true);
    expect(isSlotFree(A, [{ date: '2026-11-02', time: '09:00', durationMin: 30 }], 'discovery', '2026-11-02', '09:00', NOW)).toBe(false);
    expect(isSlotFree(A, [], 'discovery', '2026-11-07', '09:00', NOW)).toBe(false); // Saturday
  });
});
