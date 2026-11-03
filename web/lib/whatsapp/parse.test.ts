import { describe, expect, it } from 'vitest';
import { isStart, isStop, norm, parseDay, parseTime, wantsBook, wantsMenu, wantsMine, wantsPerson } from './parse';

describe('parseTime', () => {
  it.each([['8am', '08:00'], ['8 am', '08:00'], ['08:00', '08:00'], ['14:30', '14:30'], ['2pm', '14:00'], ['2 PM', '14:00'], ['8:30am', '08:30'], ['12pm', '12:00'], ['12am', '00:00'], ['10', '10:00'], ['3', '15:00'], ['14h30', '14:30'], ['9.15', '09:15']])('%s -> %s', (i, o) => {
    expect(parseTime(i)).toBe(o);
  });
  it.each(['soon', '25:00', '8:75', '', 'saturday'])('%s is not a time', (i) => {
    expect(parseTime(i)).toBeNull();
  });
});

describe('parseDay', () => {
  const now = new Date('2026-11-06T08:00:00Z'); // Friday 6 Nov, 10:00 in Johannesburg
  const offered = ['2026-11-07', '2026-11-08', '2026-11-10', '2026-11-14']; // Sat, Sun, Tue, Sat
  it('understands tomorrow and today', () => {
    expect(parseDay('tomorrow', offered, now)).toBe('2026-11-07');
    expect(parseDay('tmrw', offered, now)).toBe('2026-11-07');
    expect(parseDay('today', offered, now)).toBeNull(); // not offered
  });
  it('picks the first offered date for a weekday, in full or short form', () => {
    expect(parseDay('Saturday', offered, now)).toBe('2026-11-07');
    expect(parseDay('sat', offered, now)).toBe('2026-11-07');
    expect(parseDay('tue', offered, now)).toBe('2026-11-10');
  });
  it('understands a date like 14 nov', () => {
    expect(parseDay('14 nov', offered, now)).toBe('2026-11-14');
    expect(parseDay('14th November', offered, now)).toBe('2026-11-14');
  });
  it('never returns a day that is not offered', () => {
    expect(parseDay('monday', offered, now)).toBeNull();
    expect(parseDay('9 nov', offered, now)).toBeNull();
    expect(parseDay('whenever', offered, now)).toBeNull();
  });
});

describe('keywords', () => {
  it('spots stop and start in any case or spacing', () => {
    expect(isStop(norm(' STOP! '))).toBe(true);
    expect(isStart(norm('Start'))).toBe(true);
    expect(isStop(norm('please stop texting'))).toBe(false);
  });
  it('routes common phrases', () => {
    expect(wantsMenu(norm('Hi'))).toBe(true);
    expect(wantsBook(norm('I want to book braids'))).toBe(true);
    expect(wantsBook(norm('book'))).toBe(true);
    expect(wantsMine(norm('my bookings'))).toBe(true);
    expect(wantsMine(norm('cancel'))).toBe(true);
    expect(wantsPerson(norm('talk to a person'))).toBe(true);
    expect(wantsPerson(norm('human'))).toBe(true);
  });
  it('does not treat unrelated text as a command', () => {
    expect(wantsBook(norm('how much is a silk press'))).toBe(false);
    expect(wantsPerson(norm('is the person at the salon nice'))).toBe(false);
  });
});
