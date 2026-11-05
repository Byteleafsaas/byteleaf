// South African public holidays (dates a business is closed unless the owner opens them). When a holiday falls on a
// Sunday the next Monday is also a holiday; it is listed here under its own date. Extend the list each year.
export type Holiday = { date: string; name: string };

export const SA_HOLIDAYS: Holiday[] = [
  { date: '2026-01-01', name: 'New Year’s Day' },
  { date: '2026-03-21', name: 'Human Rights Day' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-06', name: 'Family Day' },
  { date: '2026-04-27', name: 'Freedom Day' },
  { date: '2026-05-01', name: 'Workers’ Day' },
  { date: '2026-06-16', name: 'Youth Day' },
  { date: '2026-08-10', name: 'Public holiday (Women’s Day observed)' },
  { date: '2026-09-24', name: 'Heritage Day' },
  { date: '2026-12-16', name: 'Day of Reconciliation' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-26', name: 'Day of Goodwill' },
  { date: '2027-01-01', name: 'New Year’s Day' },
  { date: '2027-03-22', name: 'Public holiday (Human Rights Day observed)' },
  { date: '2027-03-26', name: 'Good Friday' },
  { date: '2027-03-29', name: 'Family Day' },
  { date: '2027-04-27', name: 'Freedom Day' },
  { date: '2027-05-01', name: 'Workers’ Day' },
  { date: '2027-06-16', name: 'Youth Day' },
  { date: '2027-08-09', name: 'Women’s Day' },
  { date: '2027-09-24', name: 'Heritage Day' },
  { date: '2027-12-16', name: 'Day of Reconciliation' },
  { date: '2027-12-27', name: 'Public holiday (Day of Goodwill observed)' },
];

/** The next holidays on or after `today` (a YYYY-MM-DD date). */
export const upcomingHolidays = (today: string, count = 4): Holiday[] => SA_HOLIDAYS.filter((h) => h.date >= today).slice(0, count);

/** Holidays still to come that the owner has not opened: these are the days the booking calendar treats as closed. */
export const closedHolidays = (today: string, openDates: string[]): { from: string; to: string }[] =>
  SA_HOLIDAYS.filter((h) => h.date >= today && !openDates.includes(h.date)).map((h) => ({ from: h.date, to: h.date }));
