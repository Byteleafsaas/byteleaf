// Every word the booking assistant says, in one place. The wording is the design team's message library
// (`whatsapp/messages.json`, ids B01 to C17). Square-bracket text is a placeholder that stays visible until the owner fills it in.
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
/** 'Saturday 8 Nov' */
export const fmtMid = (date: string) => {
  const p = parts(date);
  return `${LONG_DAYS[p.w]} ${p.d} ${MONTHS[p.m]}`;
};
/** 'Saturday 8 November' */
export const fmtLong = (date: string) => {
  const p = parts(date);
  return `${LONG_DAYS[p.w]} ${p.d} ${LONG_MONTHS[p.m]}`;
};
/** '8 November' */
export const fmtDate = (date: string) => {
  const p = parts(date);
  return `${p.d} ${LONG_MONTHS[p.m]}`;
};
export const weekdayOf = (date: string) => parts(date).w;
export const weekdayName = (w: number) => LONG_DAYS[w];

/** 'R 650' (the amount is in cents). */
export const fmtMoney = (cents: number) => `R ${Math.round(cents / 100).toLocaleString('en-ZA').replace(/ |,/g, ' ')}`;

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

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
/** 'Three times open', 'One time open'. Past nine it is a number. */
export const timesOpen = (n: number) => `${n < 10 ? WORDS[n] : n} ${n === 1 ? 'time' : 'times'} open`;

export const PERSON_FOOTER = 'Reply PERSON to talk to us';

export const T = {
  // B01 first message from someone new
  greetNew: (business: string, privacy: string) => `Hi! I'm the automated booking assistant for *${business}*. I can book, change or cancel appointments.\n\nMay we send your confirmations and reminders here on WhatsApp? Reply STOP at any time to stop. Privacy notice: ${privacy}`,
  btnConsentYes: 'Yes, please',
  btnConsentNo: 'No reminders',
  consentThanks: "Thanks, that's saved.",
  // B09 returning client, and the plain menu
  greetSame: (name: string | undefined, service: string, staff?: string) => `Welcome back${name ? `, ${name}` : ''}! Would you like to book *${service}*${staff ? ` with ${staff}` : ''} again?`,
  greetBack: (name?: string) => (name ? `Welcome back, ${name}! What would you like to do?` : 'Hi! What would you like to do?'),
  menuBody: 'What would you like to do?',
  btnBook: 'Book',
  btnSame: 'Book the same',
  btnSomethingElse: 'Something else',
  btnMine: 'My bookings',
  btnPerson: 'Ask a person',
  btnBack: 'Back',
  // B02 shortlist, B03 service list
  shortlist: 'Great. Which service would you like?',
  otherServices: 'Other services',
  chooseService: 'Which service would you like?',
  serviceFooter: (payNote: string) => `Prices are ${payNote}`,
  serviceButton: 'See services',
  personRow: 'Ask a person',
  personRowNote: 'For anything not on this list',
  // B04 days
  dayBody: (service: string, length: string, price: string) => `*${service}* ${/s$/i.test(service) ? 'take' : 'takes'} about ${length} and ${/s$/i.test(service) ? 'cost' : 'costs'} ${price}.\n\nWhich day suits you?`,
  dayButton: 'See days',
  moreDays: 'Later dates',
  moreDaysNote: 'Show the week after',
  fullWeek: (service: string) => `${service} ${/s$/i.test(service) ? 'are' : 'is'} fully booked this week. The next open times are:`,
  askPersonCancel: 'We sometimes have cancellations',
  noDays: 'Nothing is free in the next few weeks. Would you like a person to help you find a time?',
  // B05 times
  timeBody: (date: string) => `These times are open on *${fmtLong(date)}*. Tap one to choose.`,
  timeButton: 'See times',
  timeRow: (end: string, staff?: string) => `Until ${end}${staff ? ` · with ${staff}` : ''}`,
  periodBody: (date: string) => `${fmtLong(date)} has plenty of times open. Morning, afternoon or evening?`,
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  otherDay: 'Another day',
  otherDayNote: 'Back to the list of days',
  // B06 name
  askName: 'Thanks! What name should we put the booking under?',
  // B07 confirm, B08 booked
  confirmBody: (service: string, staff: string | undefined, date: string, start: string, end: string, price: string, payNote: string) => `Please confirm your booking:\n\n*${service}*${staff ? ` with ${staff}` : ''}\n${fmtMid(date)}, ${start} to ${end}\n${price}${payNote ? `, ${payNote}` : ''}`,
  confirmBtn: 'Confirm',
  changeTime: 'Change time',
  cancelBtn: 'Cancel',
  booked: (name: string | undefined, service: string, staff: string | undefined, date: string, start: string, end: string, address: string) => `You're booked${name ? `, ${name}` : ''}!\n\n*${service}*${staff ? ` with ${staff}` : ''}\n${fmtMid(date)}, ${start} to ${end}\n${address}\n\nWe'll remind you the day before. To change or cancel, just message us here.`,
  // B10 slot taken
  takenAt: (time: string, date: string) => `Sorry, *${time} on ${fmtMid(date)}* was booked by someone else a moment ago. These times are still open:`,
  taken: 'Sorry, that time was just taken. Here are the other times open.',
  // B12 closed day, B13 past date
  closedOn: (weekday: string, nextLong: string) => `We're closed on ${weekday}s. The closest open day is *${nextLong}*.`,
  nothingOn: (weekday: string, nextLong: string) => `Nothing is open on ${weekday}s right now. The closest open day is *${nextLong}*.`,
  seeDays: 'See open days',
  pastDate: (date: string) => `${fmtDate(date)} has already passed. Did you mean a date coming up?`,
  dayClosed: (date: string) => `Nothing is open on ${fmtLong(date)}. Here are the days that are.`,
  timeNotOpen: (time: string) => `${time} isn't open. Here are the times that are.`,
  noneThen: (period: string) => `Nothing is open in the ${period}. Here are all the times that day.`,
  periodWord: { morning: 'morning', afternoon: 'afternoon', evening: 'evening' } as Record<string, string>,
  // B14 and B15: typed requests
  understood: (lines: string[], extra?: string, firstOpen?: string) => `Just to check, I understood:\n\n${lines.join('\n')}${firstOpen ? `\n\n${firstOpen}` : ''}${extra ? `\n\n${extra}` : ''}`,
  inThe: (window: string) => `in the ${window}`,
  firstOpen: (window: string | undefined, time: string) => `The first open ${window ? `${window} ` : ''}time is ${time}.`,
  btnBookAt: (time: string) => `Book ${time}`,
  btnOtherTimes: 'Other times',
  btnNotRight: 'Not right',
  btnRight: "Yes, that's right",
  staffNote: (name: string) => `I can't book a particular person by chat yet, so you'll be booked with whoever is free, not necessarily ${name}.`,
  pickYourself: "No problem, let's do it step by step.",
  notUnderstoodMenu: "Sorry, I didn't quite understand that. What would you like to do?",
  notUnderstood: "Sorry, I didn't quite understand that. Please tap one of the options.",
  // B16 voice notes, photos and stickers
  media: "Thanks! I can't listen to voice notes or open photos and stickers. Please tap an option below or type a short message.",
  // B17 outside opening hours
  closedNow: (hours: string) => `Hi! The salon is closed right now. We're open ${hours}.\n\nI can book you in now, or someone will reply when we open.`,
  btnBookNow: 'Book now',
  btnWait: 'Wait for reply',
  waitReply: "No problem. Someone will reply when we open. You can type MENU any time to book.",
  // My bookings
  noMine: 'You have no upcoming bookings.',
  mineBody: 'Here are your upcoming bookings. Tap one to change or cancel it.',
  mineButton: 'Choose booking',
  manageBody: (service: string, date: string, start: string, end: string) => `*${service}*\n${fmtMid(date)}, ${start} to ${end}\nWhat would you like to do?`,
  btnMove: 'Change time',
  btnCancelBooking: 'Cancel',
  // C06 to C09 changing a booking
  changeDayBody: 'No problem. Which day would you like instead?',
  keepRow: 'Keep my booking',
  changeTimeBody: (date: string) => `These times are open on *${fmtLong(date)}*:`,
  changeConfirm: (was: string, now: string, service: string, staff?: string) => `Please confirm the change:\n\nWas: ${was}\nNow: *${now}*\n\n${service}${staff ? ` with ${staff}` : ''}`,
  btnConfirmChange: 'Confirm change',
  btnKeepOld: 'Keep old time',
  btnAnotherTime: 'Another time',
  moved: (date: string, start: string, end: string, service: string, staff?: string) => `Done! You're now booked for *${fmtLong(date)}, ${start} to ${end}*.\n\n${service}${staff ? ` with ${staff}` : ''}. We'll remind you the day before.`,
  // C10 to C12 cancelling
  cancelAsk: (service: string, date: string, time: string) => `Cancel your *${service}* on ${fmtMid(date)} at ${time}?`,
  cancelLate: (fee: string) => `Your appointment is in less than 24 hours. Our policy has a late-cancellation fee of ${fee} for this.\n\nDo you still want to cancel?`,
  btnYesCancel: 'Yes, cancel',
  btnCancelAnyway: 'Cancel anyway',
  btnKeepIt: 'Keep it',
  cancelled: (date: string, time: string) => `Your booking for ${fmtMid(date)} at ${time} is cancelled. Message us any time to book again.`,
  kept: 'No problem, your booking stays as it is.',
  notBooked: 'No problem, nothing was booked.',
  // C13 to C17 a person, opting out
  handover: (replyTime: string) => `Sure. I've asked the team to reply here. During opening hours someone usually answers within ${replyTime}.\n\nYou can keep typing in the meantime.`,
  tookOver: (owner: string) => `You're now chatting with *${owner}* from the salon.`,
  handedBack: (owner: string) => `${owner} has handed you back to the booking assistant. Anything else I can help with?`,
  btnNoThanks: 'No, thanks',
  noThanks: 'No problem. Message us any time.',
  tooMany: (n: number) => `You already have ${n} upcoming bookings, which is the most we can hold at once. Change or cancel one first, or ask a person.`,
  stop: (booking?: string) => `Done. We won't send you any more reminders or messages.${booking ? ` Your booking on ${booking} is still in place.` : ''}\n\nTo get messages again, reply START.`,
  start: "Welcome back. We'll send your confirmations and reminders here again.",
  // C01 and C02 reminders
  reminder: (first: string, service: string, business: string, when: string, date: string, time: string) => `Hi ${first}, this is a reminder of your ${service} appointment at ${business} ${when === 'today' || when === 'tomorrow' ? `${when}, ${fmtMid(date)}` : `on ${fmtMid(date)}`}, at ${time}.\n\nCan you still make it?`,
  // C03: the clinic reminder names the practitioner and never the service or the reason for the visit.
  reminderClinic: (first: string, who: string, when: string, date: string, time: string) => `Hi ${first}, a reminder of your appointment with ${who} ${when === 'today' || when === 'tomorrow' ? `${when}, ${fmtMid(date)}` : `on ${fmtMid(date)}`}, at ${time}. Reply to confirm or change.`,
  reminderOk: (name: string | undefined, when: string, time: string) => `Thanks${name ? `, ${name}` : ''}. See you ${when} at ${time}!`,
  seeYou: 'Great, see you then!',
  btnSeeYou: 'Yes, see you',
  // Told to a client when the owner changes their booking by hand
  movedBySalon: (business: string, service: string, date: string, time: string) => `Hi, ${business} has moved your ${service} to ${fmtMid(date)} at ${time}. Reply here if you need to change it.`,
  cancelledBySalon: (business: string, service: string, date: string, time: string) => `Hi, ${business} has cancelled your ${service} on ${fmtMid(date)} at ${time}. Message us here to book again.`,
  // Fallbacks
  expired: 'That option has expired. Here is where we were.',
  noService: "I couldn't find that service. Please choose one from the list.",
  gone: "I couldn't find that booking. It may have already changed.",
};

/** How a reminder refers to the day: today, tomorrow, or (further away) just soon. */
export const relDay = (date: string, today: string) => {
  const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const diff = Math.round((d(date) - d(today)) / 86400000);
  return diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : 'soon';
};
