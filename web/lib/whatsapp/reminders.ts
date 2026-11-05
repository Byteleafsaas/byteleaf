// When is the reminder due? Pure, so the rules can be tested without sending anything.
import { addDays, sastToUtc } from '@/lib/server/time';

/** The one reminder a booking gets: the evening before, at the business's reminder hour (18:00 by default, SAST). */
export const KIND = 'day-before';
export const DEFAULT_HOUR = 18;

export type DueInput = {
  /** The appointment's date, as 'YYYY-MM-DD' in South Africa. */
  date: string;
  startsAt: Date;
  /** When the booking was made. */
  createdAt: Date;
  now: Date;
  /** The hour of the evening before that it goes out, 0 to 23. */
  hour: number;
  /** Reminder kinds already sent for this booking. */
  sent: string[];
};

/** The moment the reminder is meant to go out. */
export const reminderAt = (date: string, hour: number) => sastToUtc(addDays(date, -1), `${String(hour).padStart(2, '0')}:00`);

/**
 * True when the reminder should go out now: it is past the evening-before hour, the appointment hasn't started, and it
 * hasn't been sent. A booking made after that hour gets no reminder: someone who booked an hour ago doesn't need telling
 * about an appointment "tomorrow".
 */
export function isDue(i: DueInput): boolean {
  const at = reminderAt(i.date, i.hour);
  if (i.now.getTime() < at.getTime() || i.now.getTime() >= i.startsAt.getTime()) return false;
  if (i.sent.includes(KIND)) return false;
  return i.createdAt.getTime() < at.getTime();
}
