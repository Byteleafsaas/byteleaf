// Every word the booking assistant says, in one place, so the design team's final copy drops in here and nowhere else.
// Square-bracket text is a placeholder that stays visible until the owner fills it in.
import { LIMITS } from './types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_NAMES = MONTHS.map((m) => m.toLowerCase());
export const WEEKDAY_NAMES = LONG_DAYS.map((d) => d.toLowerCase());

const parts = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return { d, m: m - 1, w: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};

/** 'Sat 8 Nov' */
export const fmtDay = (date: string) => {
  const p = parts(date);
  return `${DAYS[p.w]} ${p.d} ${MONTHS[p.m]}`;
};
/** 'Saturday 8 November' */
export const fmtLong = (date: string) => {
  const p = parts(date);
  return `${LONG_DAYS[p.w]} ${p.d} ${LONG_MONTHS[p.m]}`;
};
export const weekdayOf = (date: string) => parts(date).w;

/** 'R 650' (the amount is in cents). */
export const fmtMoney = (cents: number) => `R ${Math.round(cents / 100).toLocaleString('en-ZA').replace(/ |,/g, ' ')}`;

/** '4 hours', '1 hour 30 min', '45 min' */
export const fmtLength = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hs = h ? `${h} hour${h === 1 ? '' : 's'}` : '';
  return [hs, m ? `${m} min` : ''].filter(Boolean).join(' ');
};

/** Cuts a title to WhatsApp's row length without breaking a word badly. */
export const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);
export const rowTitle = (s: string) => clip(s, LIMITS.rowTitle);

export const T = {
  greetNew: (business: string) => `Hi! I'm the booking assistant for ${business}. I can book, change or cancel your appointment here.\n\nBy chatting with me you agree that we message you about your bookings. Reply STOP at any time and we won't message you again.`,
  greetBack: (name?: string) => (name ? `Hi ${name}! What would you like to do?` : 'Hi! What would you like to do?'),
  menuBody: 'What would you like to do?',
  btnBook: 'Book appointment',
  btnMine: 'My bookings',
  btnPerson: 'Talk to a person',
  btnBack: 'Back',
  chooseService: 'Which service would you like?',
  serviceButton: 'Choose service',
  dayBody: (service: string, length: string, price: string) => `${service} takes about ${length} and costs ${price}. Which day suits you?`,
  dayButton: 'Choose a day',
  moreDays: 'More days',
  noDays: 'Nothing is free in the next two weeks. Would you like a person to help you find a time?',
  timeBody: (date: string) => `Here are the times open on ${fmtLong(date)}. Tap one to choose.`,
  timeButton: 'Choose a time',
  periodBody: (date: string) => `${fmtLong(date)} has plenty of times open. Morning, afternoon or evening?`,
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  otherDay: 'Pick another day',
  confirmBody: (service: string, date: string, start: string, end: string, price: string, payNote: string) => `Please confirm:\n${service}\n${fmtLong(date)}, ${start} to ${end}\n${price}${payNote ? `, ${payNote}` : ''}`,
  confirmBtn: 'Confirm',
  changeTime: 'Change time',
  cancelBtn: 'Cancel',
  booked: (name: string | undefined, service: string, date: string, start: string) => `You're booked${name ? `, ${name}` : ''}. ${service} on ${fmtLong(date)} at ${start}. We'll remind you the day before. To change or cancel, just message us here.`,
  taken: 'Sorry, that time was just taken. Here are the other times open.',
  moved: (service: string, date: string, start: string) => `Done. Your ${service} is now ${fmtLong(date)} at ${start}. We'll remind you the day before.`,
  noMine: 'You have no upcoming bookings.',
  mineBody: 'Here are your upcoming bookings. Tap one to change or cancel it.',
  mineButton: 'Choose booking',
  manageBody: (service: string, date: string, start: string, end: string) => `${service}\n${fmtLong(date)}, ${start} to ${end}\nWhat would you like to do?`,
  btnMove: 'Change time',
  btnCancelBooking: 'Cancel booking',
  cancelAsk: (late: boolean, hours: number) => (late ? `This booking is inside our ${hours}-hour cancellation window, so a fee may apply. [Cancellation policy]\n\nDo you still want to cancel it?` : 'Do you want to cancel this booking?'),
  btnYesCancel: 'Yes, cancel',
  btnKeep: 'Keep booking',
  cancelled: 'Your booking is cancelled. Message us any time to book again.',
  kept: 'No problem, your booking stays as it is.',
  notBooked: 'No problem, nothing was booked.',
  handover: (note: string) => `Okay. A person will reply here. ${note}\n\nType MENU at any time to go back to the booking assistant.`,
  seeYou: 'Great, see you then!',
  reminder: (service: string, date: string, time: string) => `Reminder: ${service} on ${fmtLong(date)} at ${time}. Still good?`,
  btnSeeYou: 'Yes, see you',
  stop: "You won't get any more messages from us. If you change your mind, reply START.",
  start: 'Welcome back! Your messages are on again.',
  notUnderstood: "Sorry, I didn't catch that. Please tap one of the options below.",
  expired: 'That option has expired. Here is where we were.',
  noService: "I couldn't find that service. Please choose one from the list.",
  gone: "I couldn't find that booking. It may have already changed.",
  // Understanding typed requests. `parts` are already in words, e.g. ['Box braids', 'Saturday 8 November', 'morning'].
  understood: (parts: string[], staffNote?: string) => `I understood: ${parts.join(', ')}. Is that right?${staffNote ? `\n\n${staffNote}` : ''}`,
  btnUnderstoodYes: "Yes, that's right",
  btnUnderstoodNo: 'No, let me pick',
  staffNote: (name: string) => `I can't book a particular person by chat yet, so you'll be booked with whoever is free, not necessarily ${name}.`,
  pickYourself: 'No problem, let\'s do it step by step.',
  dayClosed: (date: string) => `Nothing is open on ${fmtLong(date)}. Here are the days that are.`,
  timeNotOpen: (time: string) => `${time} isn't open. Here are the times that are.`,
  noneThen: (period: string) => `Nothing is open in the ${period}. Here are all the times that day.`,
  periodWord: { morning: 'morning', afternoon: 'afternoon', evening: 'evening' } as Record<string, string>,
};
