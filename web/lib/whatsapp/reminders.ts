// When is a reminder due? Pure, so the rules can be tested without sending anything.

export type DueInput = {
  startsAt: Date;
  /** When the booking was made. */
  createdAt: Date;
  now: Date;
  /** How long before the appointment this reminder goes out, in hours (for example 24 or 2). */
  hours: number;
  /** Reminder kinds already sent for this booking, such as '24h'. */
  sent: string[];
};

export const kindOf = (hours: number) => `${hours}h`;

/**
 * True when a reminder should go out now. It is due once we are inside the reminder window, the appointment hasn't
 * started, and it hasn't been sent. A booking made inside the window gets no reminder for it: someone who booked
 * an hour ago doesn't need telling about an appointment "tomorrow".
 */
export function isDue(i: DueInput): boolean {
  const lead = i.hours * 3600000;
  const untilStart = i.startsAt.getTime() - i.now.getTime();
  if (untilStart <= 0 || untilStart > lead) return false;
  if (i.sent.includes(kindOf(i.hours))) return false;
  return i.startsAt.getTime() - i.createdAt.getTime() > lead;
}
