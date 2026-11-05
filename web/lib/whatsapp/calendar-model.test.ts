import { describe, expect, it } from 'vitest';
import { freeMinutes, hasNumber, historyLine, maskPhone, slotState, statusOf, weekDates, weekStart } from './calendar-model';

describe('booking status', () => {
  it('shows a WhatsApp booking as unconfirmed until the client confirms, and hand-added ones as confirmed', () => {
    expect(statusOf({ status: 'booked', source: 'whatsapp' })).toBe('unconfirmed');
    expect(statusOf({ status: 'booked', source: 'whatsapp', confirmedAt: new Date() })).toBe('confirmed');
    expect(statusOf({ status: 'booked', source: 'manual' })).toBe('confirmed');
    expect(statusOf({ status: 'no_show', source: 'whatsapp', confirmedAt: new Date() })).toBe('noshow');
  });
});

describe('weeks', () => {
  it('starts on Monday and lists seven days', () => {
    expect(weekStart('2026-11-05')).toBe('2026-11-02'); // Thursday
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // Sunday belongs to the week before Monday 9th
    expect(weekDates('2026-11-05')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  });
});

describe('start times in the move and new-booking pickers', () => {
  const ranges: [number, number][] = [[480, 720], [780, 1020]]; // 08:00-12:00 and 13:00-17:00, a lunch break between
  const base = { ranges, busy: [{ client: 'Zanele', s: 480, e: 735 }], length: 120, nowMin: null as number | null };

  it('is off where the service does not fit before closing or the break', () => {
    expect(slotState({ ...base, start: 660 }).state).toBe('off'); // 11:00 to 13:00 runs into the break
    expect(slotState({ ...base, start: 960 }).state).toBe('off'); // 16:00 to 18:00 is after closing
  });
  it('is busy where it overlaps another booking and its clean-up, and says with whom', () => {
    const s = slotState({ ...base, start: 600 });
    expect(s.state).toBe('busy');
    expect(s.clash?.client).toBe('Zanele');
  });
  it('is free where nothing is in the way', () => {
    expect(slotState({ ...base, start: 780 }).state).toBe('free');
  });
  it('is off for times that have already passed today, but not for a future day', () => {
    expect(slotState({ ...base, start: 780, nowMin: 800 }).state).toBe('off');
    expect(slotState({ ...base, start: 780, nowMin: null }).state).toBe('free');
  });
});

describe('free time', () => {
  it('counts what is left of the working day after bookings', () => {
    expect(freeMinutes([[480, 720], [780, 1020]], [])).toBe(480);
    expect(freeMinutes([[480, 720], [780, 1020]], [{ s: 480, e: 735 }])).toBe(480 - 240);
    expect(freeMinutes([[480, 720]], [{ s: 400, e: 2000 }])).toBe(0);
  });
});

describe('what the owner sees about a client', () => {
  it('masks the middle of a phone number', () => {
    expect(maskPhone('27821234471')).toBe('+27 82 *** 4471');
    expect(maskPhone('m1730812345678')).toBe('No number yet');
    expect(hasNumber('27821234471')).toBe(true);
    expect(hasNumber('m1730812345678')).toBe(false);
  });
  it('describes the visit history', () => {
    expect(historyLine(1)).toBe('New client');
    expect(historyLine(6, { service: 'Knotless braids', date: '2026-09-14' })).toBe('6th visit · last: Knotless braids, 14 Sep');
    expect(historyLine(2, { service: 'Gel nails', date: '2026-10-01' })).toMatch(/^2nd visit/);
    expect(historyLine(12)).toBe('12th visit');
  });
});
