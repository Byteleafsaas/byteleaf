import { describe, expect, it } from 'vitest';
import { closedWeek, hoursFromWeek, previewSlots, weekFromHours, weekProblem, type Week } from './hours';
import { closedHolidays, upcomingHolidays } from './holidays';

const day = (a: number, b: number, br: [number, number] | null = null) => ({ open: true, a, b, br });

describe('turning a week into stored hours and back', () => {
  it('stores a break as the gap between two ranges and reads it back', () => {
    const w = closedWeek();
    w[1] = day(540, 1020, [810, 840]);
    w[5] = day(480, 960);
    const h = hoursFromWeek(w);
    expect(h[2]).toEqual([{ start: '09:00', end: '13:30' }, { start: '14:00', end: '17:00' }]);
    expect(h[6]).toEqual([{ start: '08:00', end: '16:00' }]);
    expect(h[1]).toBeUndefined();
    const back = weekFromHours(h);
    expect(back[1]).toEqual(w[1]);
    expect(back[5]).toEqual(w[5]);
    expect(back[0].open).toBe(false);
  });

  it('reads empty hours as a closed week', () => {
    expect(weekFromHours({}).every((d) => !d.open)).toBe(true);
    expect(weekFromHours(null).every((d) => !d.open)).toBe(true);
  });

  it('drops a break that does not sit inside the working day instead of storing nonsense', () => {
    const w = closedWeek();
    w[0] = day(480, 960, [400, 500]);
    expect(hoursFromWeek(w)[1]).toEqual([{ start: '08:00', end: '16:00' }]);
  });
});

describe('what stops a week being saved', () => {
  it('requires closing after opening and a break inside the day', () => {
    const w: Week = closedWeek();
    expect(weekProblem(w)).toBeNull();
    w[2] = day(600, 600);
    expect(weekProblem(w)).toBe('Wednesday: closing time must be after opening time.');
    w[2] = day(480, 1080, [1100, 1130]);
    expect(weekProblem(w)).toContain('break must fall inside');
    w[2] = { open: false, a: 900, b: 600, br: null }; // a closed day is never a problem
    expect(weekProblem(w)).toBeNull();
  });
});

describe('the live preview of offered times', () => {
  const week = (...days: [number, ReturnType<typeof day>][]) => { const w = closedWeek(); for (const [i, d] of days) w[i] = d; return w; };

  it('offers a start every 30 minutes where the whole service fits before closing', () => {
    const p = previewSlots({ people: [{ week: week([1, day(480, 720)]), busy: [] }], weekdayIndex: 1, minutes: 90, bufferMin: 0 });
    expect(p.map((s) => s.start)).toEqual([480, 510, 540, 570, 600, 630]); // 10:30 is the last start that still ends by 12:00
    expect(p.every((s) => s.free)).toBe(true);
  });

  it('keeps a break clear: no start whose service would run into it', () => {
    const p = previewSlots({ people: [{ week: week([1, day(480, 1020, [720, 780])]), busy: [] }], weekdayIndex: 1, minutes: 120, bufferMin: 0 });
    const starts = p.map((s) => s.start);
    expect(starts).toContain(600); // 10:00 to 12:00 ends exactly at the break
    expect(starts).not.toContain(630);
    expect(starts).not.toContain(750);
    expect(starts).toContain(780);
  });

  it('marks a start as taken when a booking and its clean-up cover it, and keeps it in the list', () => {
    const p = previewSlots({ people: [{ week: week([1, day(480, 720)]), busy: [[480, 600]] }], weekdayIndex: 1, minutes: 60, bufferMin: 15 });
    const by = Object.fromEntries(p.map((s) => [s.start, s.free]));
    expect(by[480]).toBe(false);
    expect(by[540]).toBe(false);
    expect(by[600]).toBe(true); // a 60-minute service at 10:00 ends at 11:00, after the earlier booking and its break
    expect(by[570]).toBe(false);
  });

  it('counts a start as free when anyone who does the service is free then', () => {
    const busyOne = { week: week([1, day(480, 720)]), busy: [[480, 720]] as [number, number][] };
    const freeOne = { week: week([1, day(480, 720)]), busy: [] };
    const p = previewSlots({ people: [busyOne, freeOne], weekdayIndex: 1, minutes: 60, bufferMin: 0 });
    expect(p.every((s) => s.free)).toBe(true);
    expect(previewSlots({ people: [busyOne], weekdayIndex: 1, minutes: 60, bufferMin: 0 }).every((s) => !s.free)).toBe(true);
  });

  it('offers nothing on a closed day', () => {
    expect(previewSlots({ people: [{ week: week([1, day(480, 720)]), busy: [] }], weekdayIndex: 0, minutes: 60, bufferMin: 0 })).toEqual([]);
  });
});

describe('public holidays', () => {
  it('lists the next ones and treats unopened ones as closed days', () => {
    const next = upcomingHolidays('2026-11-05', 3);
    expect(next.map((h) => h.date)).toEqual(['2026-12-16', '2026-12-25', '2026-12-26']);
    const closed = closedHolidays('2026-11-05', ['2026-12-26']).map((c) => c.from);
    expect(closed).toContain('2026-12-25');
    expect(closed).not.toContain('2026-12-26');
    expect(closed).not.toContain('2026-08-10'); // already past
  });
});
