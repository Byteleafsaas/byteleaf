import { describe, expect, it } from 'vitest';
import { freeStarts, intersect, rangesOn, windowDates } from './slots';
import { sastToUtc } from '@/lib/server/time';

const DAY = '2026-11-10'; // a Tuesday
const hours = [{ start: '08:00', end: '17:00' }];
const base = { date: DAY, ranges: hours, busy: [], durationMin: 60, bufferMin: 0, stepMin: 60, notBefore: new Date(0) };

describe('freeStarts', () => {
  it('offers every step across the working day', () => {
    expect(freeStarts(base)).toEqual(['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']);
  });

  it('stops offering starts that would run past closing time', () => {
    const long = freeStarts({ ...base, durationMin: 240, stepMin: 60 });
    expect(long[long.length - 1]).toBe('13:00'); // 13:00 to 17:00 fits, 14:00 does not
  });

  it('skips a start that overlaps a booking', () => {
    const busy = [{ start: sastToUtc(DAY, '10:00'), end: sastToUtc(DAY, '12:00') }];
    const out = freeStarts({ ...base, busy });
    expect(out).not.toContain('10:00');
    expect(out).not.toContain('11:00');
    expect(out).toContain('09:00');
    expect(out).toContain('12:00');
  });

  it('keeps the buffer between appointments', () => {
    const busy = [{ start: sastToUtc(DAY, '10:00'), end: sastToUtc(DAY, '11:00') }];
    // with a 30 minute buffer an hour-long visit at 09:00 would run into the 10:00 booking
    const out = freeStarts({ ...base, busy, bufferMin: 30, stepMin: 30 });
    expect(out).not.toContain('09:00');
    expect(out).not.toContain('09:30');
    expect(out).toContain('08:30'); // 08:30 to 09:30, then 30 minutes of buffer to 10:00
  });

  it('honours minimum notice', () => {
    const out = freeStarts({ ...base, notBefore: sastToUtc(DAY, '12:30') });
    expect(out[0]).toBe('13:00');
  });

  it('respects a lunch break between two ranges', () => {
    const out = freeStarts({ ...base, ranges: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] });
    expect(out).not.toContain('12:00');
    expect(out).toContain('13:00');
  });
});

describe('hours helpers', () => {
  it('intersects staff hours with opening hours', () => {
    expect(intersect([{ start: '08:00', end: '17:00' }], [{ start: '10:00', end: '20:00' }])).toEqual([{ start: '10:00', end: '17:00' }]);
    expect(intersect([{ start: '08:00', end: '09:00' }], [{ start: '10:00', end: '11:00' }])).toEqual([]);
  });

  it('returns nothing on a day off or a weekday not worked', () => {
    const week = { 2: hours };
    expect(rangesOn(DAY, week)).toEqual(hours);
    expect(rangesOn('2026-11-11', week)).toEqual([]); // Wednesday
    expect(rangesOn(DAY, week, [{ from: '2026-11-09', to: '2026-11-12' }])).toEqual([]);
  });

  it('lists the booking window starting today', () => {
    const dates = windowDates(new Date('2026-11-10T08:00:00Z'), 3);
    expect(dates).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
  });
});
