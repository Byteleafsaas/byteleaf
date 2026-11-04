import { describe, expect, it } from 'vitest';
import { DEFAULT_HOURS, answerHoursQuestion, detectHoursQuestion, friendlyTime, hoursContext, hoursLines, hoursSchema, hoursStatus, localTime, type WorkingHours } from './hours';

// 2026-11-03 is a Tuesday. SAST is UTC+2, so 10:00 SAST is 08:00Z.
const sast = (date: string, time: string) => new Date(`${date}T${time}:00+02:00`);
const week = (over: Partial<WorkingHours> = {}): WorkingHours => ({ ...DEFAULT_HOURS, enabled: true, ...over });

describe('localTime', () => {
  it('reads the weekday and minutes in the business time zone', () => {
    expect(localTime(sast('2026-11-03', '10:15'), 'Africa/Johannesburg')).toEqual({ day: 1, minutes: 615 });
  });
  it('crosses midnight with the zone, not the server', () => {
    // 23:30 UTC on Tuesday is 01:30 on Wednesday in SAST.
    expect(localTime(new Date('2026-11-03T23:30:00Z'), 'Africa/Johannesburg')).toEqual({ day: 2, minutes: 90 });
    expect(localTime(new Date('2026-11-03T23:30:00Z'), 'UTC')).toEqual({ day: 1, minutes: 1410 });
  });
});

describe('hoursStatus', () => {
  const h = week();
  it('is open inside the hours and says when it closes', () => {
    const s = hoursStatus(h, sast('2026-11-03', '10:00'));
    expect(s.open).toBe(true);
    expect(s.closesAt).toBe('17:00');
  });
  it('opens on the dot and closes on the dot', () => {
    expect(hoursStatus(h, sast('2026-11-03', '08:00')).open).toBe(true);
    expect(hoursStatus(h, sast('2026-11-03', '16:59')).open).toBe(true);
    expect(hoursStatus(h, sast('2026-11-03', '17:00')).open).toBe(false);
  });
  it('before opening, the next opening is later today', () => {
    expect(hoursStatus(h, sast('2026-11-03', '06:30')).next).toEqual({ daysAhead: 0, day: 1, time: '08:00' });
  });
  it('after closing, the next opening is tomorrow', () => {
    expect(hoursStatus(h, sast('2026-11-03', '18:00')).next).toEqual({ daysAhead: 1, day: 2, time: '08:00' });
  });
  it('after Saturday closes, the next opening is Monday', () => {
    const s = hoursStatus(h, sast('2026-11-07', '14:00'));
    expect(s.open).toBe(false);
    expect(s.next).toEqual({ daysAhead: 2, day: 0, time: '08:00' });
  });
  it('is closed all day on a closed day', () => {
    for (const t of ['00:00', '09:00', '23:59']) expect(hoursStatus(h, sast('2026-11-08', t)).open).toBe(false);
  });
  it('has no next opening when every day is closed', () => {
    const none = week({ days: h.days.map((d) => ({ ...d, open: false })) });
    expect(hoursStatus(none, sast('2026-11-03', '10:00'))).toMatchObject({ open: false, next: null });
  });
  it('treats a close of midnight as the end of the day', () => {
    const late = week({ days: h.days.map(() => ({ open: true, from: '10:00', to: '00:00' })) });
    expect(hoursStatus(late, sast('2026-11-03', '23:59')).open).toBe(true);
    expect(hoursStatus(late, sast('2026-11-04', '00:00')).open).toBe(false);
    expect(hoursStatus(late, sast('2026-11-04', '00:00')).next).toEqual({ daysAhead: 0, day: 2, time: '10:00' });
  });
  it('keeps a late night open into the next morning', () => {
    const bar = week({ days: h.days.map(() => ({ open: true, from: '18:00', to: '02:00' })) });
    const s = hoursStatus(bar, sast('2026-11-04', '01:00'));
    expect(s.open).toBe(true);
    expect(s.closesAt).toBe('02:00');
    expect(hoursStatus(bar, sast('2026-11-04', '02:00')).open).toBe(false);
  });
  it('uses the business time zone, not the server', () => {
    // 05:10Z is 07:10 in Johannesburg (not yet open) but 08:10 in Nairobi (open).
    const at = new Date('2026-11-03T05:10:00Z');
    expect(hoursStatus(h, at).open).toBe(false);
    expect(hoursStatus({ ...h, timezone: 'Africa/Nairobi' }, at).open).toBe(true);
  });
});

describe('friendlyTime', () => {
  it.each([['08:00', '8am'], ['17:30', '5:30pm'], ['12:00', 'noon'], ['00:00', 'midnight'], ['13:05', '1:05pm'], ['00:30', '12:30am']])('%s -> %s', (t, out) => {
    expect(friendlyTime(t)).toBe(out);
  });
});

describe('hoursLines', () => {
  it('groups runs of days with the same hours', () => {
    expect(hoursLines(week())).toEqual(['Monday to Friday: 8am to 5pm', 'Saturday: 8am to 1pm', 'Sunday: closed']);
  });
  it('lists two days with "and"', () => {
    expect(hoursLines(week(), [5, 6])).toEqual(['Saturday: 8am to 1pm', 'Sunday: closed']);
  });
});

describe('detectHoursQuestion', () => {
  const ask = (q: string, prev = '') => detectHoursQuestion(q, 1, prev);
  it.each([
    'What time do you open?', 'what time do you close', 'Are you open on Sunday?', 'are you open now?', 'Are you open today', 'What are your opening hours?', 'working hours?',
    'Are you guys still open', 'when do you close on Saturdays', 'Do you open on public holidays?', 'are you open tomorrow', 'are you closed on weekends', 'What are your business hours',
  ])('is about hours: %s', (q) => {
    expect(ask(q)).not.toBeNull();
  });
  it.each([
    'How much is the family package?', 'Do you install batteries?', 'How long does installation take?', 'What is the warranty on panels?', 'Can I open an account?', 'Do you install on Saturdays?', 'Is the inverter on the sun side of the roof?',
  ])('is not about hours: %s', (q) => {
    expect(ask(q)).toBeNull();
  });
  it('knows "now", a day, and the whole week', () => {
    expect(ask('are you open now?')).toMatchObject({ kind: 'now' });
    expect(ask('Are you open on Sunday?')).toMatchObject({ kind: 'days', days: [6] });
    expect(ask('what time do you open?')).toMatchObject({ kind: 'week' });
  });
  it('resolves today and tomorrow from the business weekday', () => {
    expect(detectHoursQuestion('are you open today', 4)?.days).toEqual([4]);
    expect(detectHoursQuestion('are you open tomorrow', 6)?.days).toEqual([0]);
  });
  it('reads weekends as Saturday and Sunday', () => {
    expect(ask('are you open on weekends')?.days).toEqual([5, 6]);
  });
  it('flags holiday questions', () => {
    expect(ask('are you open on public holidays?')?.holiday).toBe(true);
    expect(ask('are you open today')?.holiday).toBe(false);
  });
  it('follows on from the last question about hours', () => {
    expect(ask('and Sunday?', 'what time do you open?')).toMatchObject({ kind: 'days', days: [6] });
    expect(ask('and Sunday?', 'how much is the family package?')).toBeNull();
    expect(ask('and the second one?', 'what time do you open?')).toBeNull();
  });
});

describe('answerHoursQuestion', () => {
  const h = week();
  const answer = (q: string, at: Date, hours = h) => answerHoursQuestion(hours, detectHoursQuestion(q, localTime(at, hours.timezone).day)!, at);

  it('says yes when open now', () => {
    expect(answer('are you open now?', sast('2026-11-03', '10:00')).text).toBe("Yes, we're open right now. We close at 5pm.");
  });
  it('says no when closed now and when it opens again', () => {
    expect(answer('are you open now?', sast('2026-11-03', '18:00')).text).toBe("No, we're closed right now. We open again tomorrow at 8am.");
    expect(answer('are you open now?', sast('2026-11-03', '06:00')).text).toBe("No, we're closed right now. We open again today at 8am.");
  });
  it('after Saturday, the next opening is Monday', () => {
    expect(answer('are you open now?', sast('2026-11-07', '15:00')).text).toBe("No, we're closed right now. We open again on Monday at 8am.");
  });
  it('answers for a day that is open', () => {
    expect(answer('are you open on Saturday?', sast('2026-11-03', '10:00')).text).toBe("Yes, we're open on Saturday, from 8am to 1pm.");
  });
  it('answers for a day that is closed all day, with the next opening', () => {
    expect(answer('are you open on Sunday?', sast('2026-11-03', '10:00')).text).toBe("No, we're closed on Sunday. We open again on Monday at 8am.");
    expect(answer('are you open today?', sast('2026-11-08', '10:00')).text).toBe("No, we're closed today. We open again tomorrow at 8am.");
  });
  it('says so when today’s hours are over', () => {
    expect(answer('are you open today?', sast('2026-11-03', '18:00')).text).toBe("We were open today from 8am to 5pm, but we're closed now. We open again tomorrow at 8am.");
  });
  it('lists the week when no day is asked about', () => {
    const a = answer('what time do you open?', sast('2026-11-03', '10:00'));
    expect(a.text).toBe('Here are our working hours:');
    expect(a.list).toEqual(['Monday to Friday: 8am to 5pm', 'Saturday: 8am to 1pm', 'Sunday: closed']);
  });
  it('lists the weekend', () => {
    const a = answer('open on weekends?', sast('2026-11-03', '10:00'));
    expect(a.text).toBe('Here are our weekend hours:');
    expect(a.list).toEqual(['Saturday: 8am to 1pm', 'Sunday: closed']);
  });
  it('adds the holiday note', () => {
    const note = week({ note: 'Closed on public holidays' });
    expect(answer('are you open now?', sast('2026-11-03', '10:00'), note).text).toBe("Yes, we're open right now. We close at 5pm. Closed on public holidays.");
    expect(answer('are you open on public holidays?', sast('2026-11-03', '10:00'), note)).toEqual({ text: 'Closed on public holidays. Our usual hours are:', list: ['Monday to Friday: 8am to 5pm', 'Saturday: 8am to 1pm', 'Sunday: closed'] });
    expect(answer('are you open on public holidays?', sast('2026-11-03', '10:00')).text).toContain('check with the team');
    expect(answer('what are your hours', sast('2026-11-03', '10:00'), note).list).toContain('Closed on public holidays');
  });
  it('copes with a business that has no open days', () => {
    const none = week({ days: h.days.map((d) => ({ ...d, open: false })) });
    expect(answer('are you open now?', sast('2026-11-03', '10:00'), none).text).toContain('not open on any regular day');
  });
});

describe('hoursContext', () => {
  it('gives the model the week, the note and the current state', () => {
    const c = hoursContext(week({ note: 'Closed on public holidays' }), sast('2026-11-03', '18:00'));
    expect(c).toContain('Monday: 8am to 5pm');
    expect(c).toContain('Sunday: closed');
    expect(c).toContain('Note: Closed on public holidays');
    expect(c).toContain('Right now it is Tuesday 18:00');
    expect(c).toContain('We are closed right now. We next open tomorrow at 8am.');
  });
});

describe('hoursSchema', () => {
  it('accepts the defaults', () => {
    expect(hoursSchema.safeParse(DEFAULT_HOURS).success).toBe(true);
  });
  it('rejects a bad time, a bad zone, the wrong number of days and an open day with equal times', () => {
    const days = DEFAULT_HOURS.days;
    expect(hoursSchema.safeParse({ ...DEFAULT_HOURS, days: [{ open: true, from: '8am', to: '17:00' }, ...days.slice(1)] }).success).toBe(false);
    expect(hoursSchema.safeParse({ ...DEFAULT_HOURS, timezone: 'Mars/Olympus' }).success).toBe(false);
    expect(hoursSchema.safeParse({ ...DEFAULT_HOURS, days: days.slice(1) }).success).toBe(false);
    expect(hoursSchema.safeParse({ ...DEFAULT_HOURS, days: [{ open: true, from: '08:00', to: '08:00' }, ...days.slice(1)] }).success).toBe(false);
  });
  it('lets a closed day keep any times', () => {
    expect(hoursSchema.safeParse({ ...DEFAULT_HOURS, days: [{ open: false, from: '08:00', to: '08:00' }, ...DEFAULT_HOURS.days.slice(1)] }).success).toBe(true);
  });
});
