// The booking conversation as a state machine. Given where the customer is, and what they just did, it says what to
// reply and where they are now. It never touches the database or WhatsApp: everything it needs comes in through `Ctx`,
// so every path can be tested with a pretend calendar. The wording lives in `copy.ts`; the order of checks follows the design handoff.
import { PERSON_FOOTER, T, clip, fmtDay, fmtLength, fmtLong, fmtMid, fmtMoney, rowTitle, timesOpen, weekdayName } from './copy';
import { isStart, isStop, no, norm, parseDay, parseTime, parseWhen, wantsBook, wantsMenu, wantsMine, wantsPerson, yes } from './parse';
import { addDays, todaySast } from '@/lib/server/time';
import { fromMin, toMin } from './slots';
import { LIMITS, type Input, type Out, type Row } from './types';
import type { Interpretation, Interpreter } from './understand';

/** `name` is what clients are told: "Appointment" for a service whose name is kept out of messages (a clinic), and `hideName` says so. */
export type Svc = { id: string; name: string; minutes: number; priceCents: number; hideName?: boolean };
export type Appt = { id: string; serviceId: string; serviceName: string; staffName?: string; date: string; time: string; endTime: string; priceCents: number; startsAt: Date };

export type BookResult = { ok: true; appt: Appt } | { ok: false; reason: 'taken' | 'invalid' };

/** Everything the conversation needs from the outside world. */
export type Ctx = {
  business: {
    name: string;
    cancelWindowHours: number;
    /** The most future bookings one customer can hold. */
    maxUpcoming: number;
    /** How quickly a person usually answers, for example "2 hours". */
    replyTime: string;
    payNote: string;
    address: string;
    privacyUrl: string;
    /** The late-cancellation fee as the client reads it, for example "R 150". */
    lateFee: string;
    /** "Tuesday to Friday 08:00–18:00 and Saturday 08:00–16:00" */
    hoursText: string;
    openNow: boolean;
    /** JavaScript weekdays (0 = Sunday) the business is never open. */
    closedWeekdays: number[];
  };
  client: {
    name?: string;
    /** True once the customer has typed their name for us, rather than it coming from their WhatsApp profile. */
    nameConfirmed: boolean;
    isNew: boolean;
    optedOut: boolean;
    /** The last booking they made, so a returning customer can book the same again. */
    last?: { serviceId: string; serviceName: string; staffName?: string };
  };
  now: Date;
  /** Reads typed free text ("braids on Saturday morning"). Absent, or returning null, means the keyword parser alone is used. */
  interpret?: Interpreter;
  services(): Promise<Svc[]>;
  /** Dates with at least one free start, soonest first. */
  days(serviceId: string, excludeApptId?: string): Promise<{ date: string; count: number }[]>;
  times(serviceId: string, date: string, excludeApptId?: string): Promise<string[]>;
  /** For each start time that only one person could take, that person's name. Times with a choice are left out, because we pick for them. */
  staffAt?(serviceId: string, date: string, excludeApptId?: string): Promise<Record<string, string>>;
  upcoming(): Promise<Appt[]>;
  appointment(id: string): Promise<Appt | null>;
  /** Keeps a slot for this customer for five minutes while they read the confirmation. False when it was taken. Absent means no holding. */
  hold?(i: { serviceId: string; date: string; time: string }): Promise<boolean>;
  /** Gives back a slot this customer was holding. */
  release?(): Promise<void>;
  book(i: { serviceId: string; date: string; time: string }): Promise<BookResult>;
  move(apptId: string, date: string, time: string): Promise<BookResult>;
  cancel(apptId: string): Promise<{ ok: true; late: boolean } | { ok: false }>;
};

export type Step = 'menu' | 'consent' | 'service' | 'day' | 'time' | 'name' | 'confirm' | 'understood' | 'mine' | 'manage' | 'cancel' | 'handover' | 'optedout';
export type State = {
  step: Step;
  /** What we think a typed request meant, waiting for the customer to say yes */
  hint?: Interpretation;
  /** What a new customer first wrote, used to offer a shortlist once they have answered the consent question. */
  first?: string;
  serviceId?: string;
  date?: string;
  time?: string;
  apptId?: string;
  /** 'move' while changing an existing booking */
  mode?: 'new' | 'move';
  dayPage?: number;
  period?: 'morning' | 'afternoon' | 'evening';
  /** The closed-hours message has been shown, so it isn't repeated on the next message. */
  hoursShown?: boolean;
  /** They asked for later dates, so the plain list of days is shown instead of the next open times. */
  seeAll?: boolean;
};
export type Effect = 'handover' | 'optout' | 'optin' | 'consent:yes' | 'consent:no' | `name:${string}` | `confirm:${string}`;
export type Result = { state: State; messages: Out[]; effects: Effect[] };

export const START: State = { step: 'menu' };

const text = (body: string): Out => ({ type: 'text', body });
const DAY_PAGE = 7; // one week of open days per list
const PAGE = LIMITS.listRows - 1; // leave one row for "Another day"
const periodOf = (t: string) => (toMin(t) < 12 * 60 ? 'morning' : toMin(t) < 17 * 60 ? 'afternoon' : 'evening');
const done = (r: { state: State; messages: Out[] }): Result => ({ ...r, effects: [] });
const lead1 = (lead?: string): Out[] => (lead ? [text(lead)] : []);

const personBtn = { id: 'menu:person', title: T.btnPerson };

/** Three-button menu: book, my bookings, ask a person. A returning customer with a past booking is offered "book the same". */
function menu(ctx: Ctx, welcome = false): Out[] {
  const c = ctx.client;
  if (welcome && c.last) {
    return [{ type: 'buttons', body: T.greetSame(c.name, c.last.serviceName, c.last.staffName), buttons: [{ id: 'menu:same', title: T.btnSame }, { id: 'menu:book', title: T.btnSomethingElse }, { id: 'menu:mine', title: T.btnMine }] }];
  }
  const body = welcome ? T.greetBack(c.name) : T.menuBody;
  return [{ type: 'buttons', body, buttons: [{ id: 'menu:book', title: T.btnBook }, { id: 'menu:mine', title: T.btnMine }, personBtn] }];
}

/** B01: the first message to someone new, with the consent question. */
const consentPrompt = (ctx: Ctx): Out => ({ type: 'buttons', body: T.greetNew(ctx.business.name, ctx.business.privacyUrl), buttons: [{ id: 'consent:yes', title: T.btnConsentYes }, { id: 'consent:no', title: T.btnConsentNo }, personBtn] });

/** B15: we didn't understand. Three safe ways forward. */
const lostMenu = (body: string): Out => ({ type: 'buttons', body, buttons: [{ id: 'menu:book', title: T.btnBook }, { id: 'menu:mine', title: T.btnMine }, personBtn] });

/** When a customer already holds as many future bookings as allowed, say so and point to My bookings instead of offering more. */
async function limitPrompt(ctx: Ctx): Promise<Out[] | null> {
  const mine = await ctx.upcoming();
  if (mine.length < ctx.business.maxUpcoming) return null;
  return [{ type: 'buttons', body: T.tooMany(mine.length), buttons: [{ id: 'menu:mine', title: T.btnMine }, personBtn] }];
}

async function servicePrompt(ctx: Ctx, lead?: string): Promise<Out[]> {
  const svcs = await ctx.services();
  // Nine services at most: the tenth row is "Ask a person".
  const rows: Row[] = svcs.slice(0, LIMITS.listRows - 1).map((s) => ({ id: `svc:${s.id}`, title: rowTitle(s.name), description: `${fmtLength(s.minutes)} · ${fmtMoney(s.priceCents)}` }));
  rows.push({ id: 'menu:person', title: T.personRow, description: T.personRowNote });
  return [...lead1(lead), { type: 'list', body: T.chooseService, footer: T.serviceFooter(ctx.business.payNote), button: T.serviceButton, rows }];
}

/** B02: when the first message names a service, offer the closest matches as buttons. Null when nothing matches. */
async function shortlist(ctx: Ctx, first?: string): Promise<Out | null> {
  const words = norm(first ?? '').split(' ').filter((w) => w.length >= 4);
  if (!words.length) return null;
  const hits = (await ctx.services()).filter((s) => words.some((w) => norm(s.name).includes(w))).slice(0, 2);
  if (!hits.length) return null;
  return { type: 'buttons', body: T.shortlist, buttons: [...hits.map((s) => ({ id: `svc:${s.id}`, title: clip(s.name, LIMITS.buttonTitle) })), { id: 'svc:other', title: T.otherServices }] };
}

async function dayPrompt(ctx: Ctx, s: State, lead?: string): Promise<{ state: State; messages: Out[] }> {
  const moving = s.mode === 'move';
  const svc = (await ctx.services()).find((x) => x.id === s.serviceId);
  const days = await ctx.days(s.serviceId!, moving ? s.apptId : undefined);
  if (!svc || !days.length) {
    return { state: { step: 'menu' }, messages: [...lead1(lead), { type: 'buttons', body: T.noDays, buttons: [personBtn, { id: 'menu:book', title: T.btnBook }] }] };
  }
  // Nothing in the next seven days: show the next open times themselves (B11) instead of a list that starts a week away.
  if (!moving && !s.seeAll && days[0].date > addDays(todaySast(ctx.now), 6)) {
    const who = (await ctx.staffAt?.(s.serviceId!, days[0].date)) ?? {};
    const picks: { date: string; time: string }[] = [];
    for (const d of days.slice(0, 3)) {
      for (const time of (await ctx.times(s.serviceId!, d.date)).slice(0, 2)) if (picks.length < 3) picks.push({ date: d.date, time });
      if (picks.length >= 3) break;
    }
    if (picks.length) {
      const rows: Row[] = [
        ...picks.map((p) => ({ id: `slot:${p.date}|${p.time}`, title: `${fmtDay(p.date)}, ${p.time}`, description: T.timeRow(fromMin(toMin(p.time) + svc.minutes), p.date === days[0].date ? who[p.time] : undefined) })),
        { id: 'day:list', title: T.moreDays, description: T.moreDaysNote },
        { id: 'menu:person', title: T.personRow, description: T.askPersonCancel },
      ];
      return { state: { ...s, step: 'day', dayPage: 0 }, messages: [...lead1(lead), { type: 'list', body: T.fullWeek(svc.name), footer: PERSON_FOOTER, button: T.timeButton, rows }] };
    }
  }
  const page = s.dayPage ?? 0;
  const slice = days.slice(page * DAY_PAGE, page * DAY_PAGE + DAY_PAGE);
  const rows: Row[] = slice.map((d) => ({ id: `day:${d.date}`, title: fmtDay(d.date), description: timesOpen(d.count) }));
  if (days.length > (page + 1) * DAY_PAGE) rows.push({ id: 'day:more', title: T.moreDays, description: T.moreDaysNote });
  let body = T.dayBody(svc.name, fmtLength(svc.minutes), fmtMoney(svc.priceCents));
  if (moving) {
    body = T.changeDayBody;
    const old = s.apptId ? await ctx.appointment(s.apptId) : null;
    if (old) rows.push({ id: 'keep', title: T.keepRow, description: `${fmtDay(old.date)}, ${old.time}` });
  }
  return { state: { ...s, step: 'day', dayPage: page }, messages: [...lead1(lead), { type: 'list', body, footer: PERSON_FOOTER, button: T.dayButton, rows }] };
}

async function timePrompt(ctx: Ctx, s: State, lead?: string, taken?: { time: string; date: string }): Promise<{ state: State; messages: Out[] }> {
  const moving = s.mode === 'move';
  const excl = moving ? s.apptId : undefined;
  const all = await ctx.times(s.serviceId!, s.date!, excl);
  const svc = (await ctx.services()).find((x) => x.id === s.serviceId);
  if (!all.length || !svc) return dayPrompt(ctx, { ...s, date: undefined, time: undefined, period: undefined }, T.taken);
  // A wished-for part of the day with nothing open in it: show the whole day instead of an empty list.
  if (s.period && !all.some((t) => periodOf(t) === s.period)) return timePrompt(ctx, { ...s, period: undefined }, lead ?? T.noneThen(T.periodWord[s.period]), taken);
  const before = lead1(lead);
  // Many times open: ask morning, afternoon or evening first, so the list stays short enough for WhatsApp.
  if (all.length > PAGE && !s.period) {
    const periods = (['morning', 'afternoon', 'evening'] as const).filter((p) => all.some((t) => periodOf(t) === p));
    if (periods.length > 1) {
      const label = { morning: T.morning, afternoon: T.afternoon, evening: T.evening };
      return { state: { ...s, step: 'time' }, messages: [...before, { type: 'buttons', body: T.periodBody(s.date!), buttons: periods.map((p) => ({ id: `period:${p}`, title: label[p] })) }] };
    }
  }
  let times = s.period ? all.filter((t) => periodOf(t) === s.period) : all;
  if (times.length > PAGE) times = Array.from({ length: PAGE }, (_, i) => times[Math.round((i * (times.length - 1)) / (PAGE - 1))]);
  const who = (await ctx.staffAt?.(s.serviceId!, s.date!, excl)) ?? {};
  const rows: Row[] = [...times.map((t) => ({ id: `time:${t}`, title: t, description: T.timeRow(fromMin(toMin(t) + svc.minutes), who[t]) })), { id: 'time:day', title: T.otherDay, description: T.otherDayNote }];
  const body = taken ? T.takenAt(taken.time, taken.date) : moving ? T.changeTimeBody(s.date!) : T.timeBody(s.date!);
  return { state: { ...s, step: 'time' }, messages: [...before, { type: 'list', body, footer: PERSON_FOOTER, button: T.timeButton, rows }] };
}

/** After a time is chosen: ask a new customer for their name, otherwise go straight to the confirmation. */
async function afterTime(ctx: Ctx, s: State): Promise<{ state: State; messages: Out[] }> {
  if (s.mode !== 'move' && !ctx.client.nameConfirmed) return { state: { ...s, step: 'name' }, messages: [text(T.askName)] };
  return holdThenConfirm(ctx, s);
}

/**
 * The confirmation screen for a new booking. The slot is held for five minutes first, so nobody else can take it while the
 * customer decides. If it was taken a moment ago, they are told and shown the times that are still open.
 */
async function holdThenConfirm(ctx: Ctx, s: State): Promise<{ state: State; messages: Out[] }> {
  if (s.mode !== 'move' && ctx.hold && !(await ctx.hold({ serviceId: s.serviceId!, date: s.date!, time: s.time! }))) {
    return timePrompt(ctx, { ...s, step: 'time', time: undefined, period: undefined }, undefined, { time: s.time!, date: s.date! });
  }
  return confirmPrompt(ctx, s);
}

async function confirmPrompt(ctx: Ctx, s: State): Promise<{ state: State; messages: Out[] }> {
  const svc = (await ctx.services()).find((x) => x.id === s.serviceId)!;
  const end = fromMin(toMin(s.time!) + svc.minutes);
  const moving = s.mode === 'move';
  // A clinic visit that doesn't name the service says who it is with, even when we haven't picked a person yet.
  const who = (await ctx.staffAt?.(s.serviceId!, s.date!, moving ? s.apptId : undefined))?.[s.time!] ?? (svc.hideName ? 'Dr [name]' : undefined);
  if (moving) {
    const old = s.apptId ? await ctx.appointment(s.apptId) : null;
    const was = old ? `${fmtDay(old.date)}, ${old.time}` : '';
    const now = `${fmtDay(s.date!)}, ${s.time} to ${end}`;
    return { state: { ...s, step: 'confirm' }, messages: [{ type: 'buttons', body: T.changeConfirm(was, now, svc.name, who), buttons: [{ id: 'ok', title: T.btnConfirmChange }, { id: 'keep', title: T.btnKeepOld }, { id: 'change', title: T.btnAnotherTime }] }] };
  }
  const body = T.confirmBody(svc.name, who, s.date!, s.time!, end, fmtMoney(svc.priceCents), ctx.business.payNote);
  return { state: { ...s, step: 'confirm' }, messages: [{ type: 'buttons', body, footer: PERSON_FOOTER, buttons: [{ id: 'ok', title: T.confirmBtn }, { id: 'change', title: T.changeTime }, { id: 'cancel', title: T.cancelBtn }] }] };
}

async function minePrompt(ctx: Ctx): Promise<{ state: State; messages: Out[] }> {
  const list = (await ctx.upcoming()).slice(0, LIMITS.listRows);
  if (!list.length) return { state: { step: 'menu' }, messages: [text(T.noMine), ...menu(ctx)] };
  const rows: Row[] = list.map((a) => ({ id: `appt:${a.id}`, title: rowTitle(`${fmtDay(a.date)} ${a.time}`), description: clip(a.serviceName, LIMITS.rowDescription) }));
  return { state: { step: 'mine' }, messages: [{ type: 'list', body: T.mineBody, button: T.mineButton, rows }] };
}

function managePrompt(a: Appt): { state: State; messages: Out[] } {
  return { state: { step: 'manage', apptId: a.id }, messages: [{ type: 'buttons', body: T.manageBody(a.serviceName, a.date, a.time, a.endTime), buttons: [{ id: 'move', title: T.btnMove }, { id: 'cancelbk', title: T.btnCancelBooking }, { id: 'back', title: T.btnBack }] }] };
}

/** C10 / C12: asks whether to cancel. Inside the late window it states the fee once and still offers to move instead. */
function cancelPrompt(ctx: Ctx, a: Appt): { state: State; messages: Out[] } {
  const late = a.startsAt.getTime() - ctx.now.getTime() < ctx.business.cancelWindowHours * 3600000;
  const messages: Out[] = late
    ? [{ type: 'buttons', body: T.cancelLate(ctx.business.lateFee), footer: PERSON_FOOTER, buttons: [{ id: 'yes', title: T.btnCancelAnyway }, { id: 'move', title: T.changeTime }, { id: 'no', title: T.btnKeepIt }] }]
    : [{ type: 'buttons', body: T.cancelAsk(a.serviceName, a.date, a.time), buttons: [{ id: 'yes', title: T.btnYesCancel }, { id: 'no', title: T.btnKeepIt }, { id: 'move', title: T.changeTime }] }];
  return { state: { step: 'cancel', apptId: a.id }, messages };
}

/** B14: says back what we think the customer meant and waits for a tap. Nothing is booked from this. */
async function understoodPrompt(ctx: Ctx, hint: Interpretation): Promise<{ state: State; messages: Out[] }> {
  const svc = hint.serviceId ? (await ctx.services()).find((x) => x.id === hint.serviceId) : undefined;
  const day = hint.date ? fmtMid(hint.date) : '';
  const when = hint.time ? `${day} at ${hint.time}`.trim() : [day, hint.window ? T.inThe(T.periodWord[hint.window]) : ''].filter(Boolean).join(', ');
  const lines = [svc && `*${svc.name}*`, when].filter((l): l is string => Boolean(l));
  // The first open time inside the wished-for part of the day, offered as a one-tap booking.
  let first: string | undefined;
  if (svc && hint.date && !hint.time) {
    const open = await ctx.times(svc.id, hint.date);
    first = open.find((t) => !hint.window || periodOf(t) === hint.window);
  }
  const body = T.understood(lines, hint.staff ? T.staffNote(hint.staff) : undefined, first ? T.firstOpen(hint.window && T.periodWord[hint.window], first) : undefined);
  const buttons = first
    ? [{ id: `u:book:${first}`, title: T.btnBookAt(first) }, { id: 'u:yes', title: T.btnOtherTimes }, { id: 'u:no', title: T.btnNotRight }]
    : [{ id: 'u:yes', title: T.btnRight }, { id: 'u:no', title: T.btnNotRight }];
  return { state: { step: 'understood', hint }, messages: [{ type: 'buttons', body, buttons }] };
}

/**
 * Asks the interpreter what a typed message meant and, if it understood something that really exists, says it back.
 * Null means "carry on as before" (no interpreter, it failed, or it made no sense), so the keyword parser's answer stands.
 */
async function understand(ctx: Ctx, state: State, input: Input): Promise<Result | null> {
  if (!ctx.interpret || input.type !== 'text' || ctx.client.isNew || state.mode === 'move') return null;
  const words = input.text.trim();
  if (!words || words.length > 300) return null;
  let found: Interpretation | null;
  try { found = await ctx.interpret(words); } catch { return null; }
  if (!found) return null;
  // Check again here: the model's answer is never trusted to name a real service.
  const svcs = await ctx.services();
  // A correction typed at "Is that right?" keeps the service we had already understood.
  const kept = state.step === 'understood' ? state.hint?.serviceId : state.step !== 'menu' ? state.serviceId : undefined;
  const serviceId = (found.serviceId && svcs.some((s) => s.id === found!.serviceId) ? found.serviceId : undefined) ?? kept;
  const hint: Interpretation = { ...found, serviceId };
  if (!hint.serviceId && !hint.date && !hint.window && !hint.time) return null;
  return done(await understoodPrompt(ctx, hint));
}

/** The customer said yes to what we understood: carry on to the same day and time choices as if they had tapped through. */
async function applyHint(ctx: Ctx, hint: Interpretation): Promise<Result> {
  if (!hint.serviceId) return { state: { step: 'service', hint }, messages: await servicePrompt(ctx), effects: [] };
  const base: State = { step: 'day', serviceId: hint.serviceId, mode: 'new', period: hint.window ?? (hint.time ? periodOf(hint.time) : undefined) };
  if (!hint.date) return done(await dayPrompt(ctx, base));
  const days = (await ctx.days(hint.serviceId)).map((d) => d.date);
  if (!days.includes(hint.date)) return done(await dayPrompt(ctx, base, T.dayClosed(hint.date)));
  const open = await ctx.times(hint.serviceId, hint.date);
  if (hint.time && open.includes(hint.time)) return done(await afterTime(ctx, { ...base, date: hint.date, time: hint.time }));
  return done(await timePrompt(ctx, { ...base, step: 'time', date: hint.date }, hint.time ? T.timeNotOpen(hint.time) : undefined));
}

/** Asks the question for wherever the customer currently is. Used to carry on after a mistake or a stale button. */
async function reprompt(ctx: Ctx, s: State, lead?: string): Promise<Result> {
  const before = lead1(lead);
  switch (s.step) {
    case 'service': return { state: s, messages: await servicePrompt(ctx, lead), effects: [] };
    case 'day': return done(await dayPrompt(ctx, s, lead));
    case 'time': return done(await timePrompt(ctx, s, lead));
    case 'name': return { state: s, messages: [...before, text(T.askName)], effects: [] };
    case 'consent': return { state: s, messages: [...before, consentPrompt(ctx)], effects: [] };
    case 'confirm': { const r = await confirmPrompt(ctx, s); return done({ ...r, messages: [...before, ...r.messages] }); }
    case 'understood': { if (!s.hint) return { state: START, messages: menu(ctx), effects: [] }; const r = await understoodPrompt(ctx, s.hint); return done({ ...r, messages: [...before, ...r.messages] }); }
    case 'mine': { const r = await minePrompt(ctx); return done({ ...r, messages: [...before, ...r.messages] }); }
    case 'manage': { const a = s.apptId ? await ctx.appointment(s.apptId) : null; if (!a) return { state: START, messages: [text(T.gone), ...menu(ctx)], effects: [] }; const r = managePrompt(a); return done({ ...r, messages: [...before, ...r.messages] }); }
    default: return { state: START, messages: [...before, ...menu(ctx)], effects: [] };
  }
}

/** The customer typed a day we don't offer. Say why, in the design's words, rather than just asking again. */
async function explainDay(ctx: Ctx, state: State, input: Input): Promise<Result | null> {
  if (input.type !== 'text') return null;
  const when = parseWhen(input.text, ctx.now);
  if (!when) return null;
  const days = await ctx.days(state.serviceId!, state.mode === 'move' ? state.apptId : undefined);
  if (!days.length) return null;
  const next = days[0].date;
  const seeDays = { id: 'day:list', title: T.seeDays };
  if ('date' in when) {
    const nowDate = new Date(ctx.now.getTime() + 2 * 3600000).toISOString().slice(0, 10);
    if (when.date < nowDate) return { state, messages: [{ type: 'buttons', body: T.pastDate(when.date), buttons: [seeDays, personBtn] }], effects: [] };
    return done(await dayPrompt(ctx, { ...state, dayPage: 0 }, T.dayClosed(when.date)));
  }
  const name = weekdayName(when.weekday);
  const body = ctx.business.closedWeekdays.includes(when.weekday) ? T.closedOn(name, fmtLong(next)) : T.nothingOn(name, fmtLong(next));
  return { state, messages: [{ type: 'buttons', body, buttons: [{ id: `day:${next}`, title: fmtDay(next) }, seeDays, personBtn] }], effects: [] };
}

/** One turn of the conversation. */
export async function step(state: State, input: Input, ctx: Ctx): Promise<Result> {
  const t = input.type === 'text' ? norm(input.text) : '';
  const id = input.type === 'reply' ? input.id : '';
  const out = (s: State, messages: Out[], effects: Effect[] = []): Result => ({ state: s, messages, effects });

  // 1 and 2. Stop and start work everywhere, whatever else is going on.
  if (isStop(t)) {
    const next = (await ctx.upcoming())[0];
    return out({ step: 'optedout' }, [text(T.stop(next && `${fmtMid(next.date)} at ${next.time}`))], ['optout']);
  }
  if (ctx.client.optedOut || state.step === 'optedout') {
    if (isStart(t)) return out(START, [text(T.start), ...menu(ctx)], ['optin']);
    return out({ step: 'optedout' }, []); // they asked not to be messaged, so we stay quiet
  }

  // Taps on a reminder: confirm, change the time or cancel. These work whatever the customer was doing before.
  if (id.startsWith('remind:')) {
    const [, action, apptId] = id.split(':');
    const a = apptId ? await ctx.appointment(apptId) : null;
    if (action === 'ok') {
      if (!a) return out(state.step === 'handover' ? state : START, [text(T.seeYou)]);
      const today = new Date(ctx.now.getTime() + 2 * 3600000).toISOString().slice(0, 10);
      const when = a.date === today ? 'today' : new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10) === a.date ? 'tomorrow' : `on ${fmtDay(a.date)}`;
      return out(state.step === 'handover' ? state : START, [text(T.reminderOk(ctx.client.name, when, a.time))], [`confirm:${a.id}`]);
    }
    if (!a) return out(START, [text(T.gone), ...menu(ctx)]);
    if (action === 'move') return done(await dayPrompt(ctx, { step: 'day', serviceId: a.serviceId, apptId: a.id, mode: 'move' }));
    if (action === 'cancel') return done(cancelPrompt(ctx, a));
  }

  // 3. A person has the chat. A greeting or a question is for them, so the assistant stays quiet. Only MENU hands it back.
  if (state.step === 'handover') return /^(menu|bot|start over|restart)$/.test(t) ? out(START, menu(ctx)) : out(state, []);

  // Asking for a person works at every step, including the consent question.
  if (id === 'menu:person' || wantsPerson(t)) return out({ step: 'handover' }, [text(T.handover(ctx.business.replyTime))], ['handover']);

  // 5. Voice notes, photos and stickers: we can't read them, so point back to the buttons.
  if (input.type === 'media') return out(state, [lostMenu(T.media)]);

  // 8. Someone new gets the consent question before anything is booked.
  if (ctx.client.isNew && state.step === 'menu' && !id) return out({ step: 'consent', first: input.type === 'text' ? input.text : undefined }, [consentPrompt(ctx)]);
  if (id === 'consent:yes' || id === 'consent:no') {
    const effect: Effect = id === 'consent:yes' ? 'consent:yes' : 'consent:no';
    const stop = await limitPrompt(ctx);
    if (stop) return out(START, stop, [effect]);
    const short = await shortlist(ctx, state.first);
    return out({ step: 'service' }, short ? [short] : await servicePrompt(ctx), [effect]);
  }
  if (state.step === 'consent') return reprompt(ctx, state, T.notUnderstood);

  // 4. Outside opening hours: say so once, and let them book anyway.
  if (state.step === 'menu' && !id && !state.hoursShown && !ctx.business.openNow && !wantsBook(t) && !wantsMine(t)) {
    return out({ step: 'menu', hoursShown: true }, [{ type: 'buttons', body: T.closedNow(ctx.business.hoursText), buttons: [{ id: 'menu:book', title: T.btnBookNow }, { id: 'wait', title: T.btnWait }] }]);
  }
  if (id === 'wait') return out({ step: 'handover' }, [text(T.waitReply)], ['handover']);

  // "No, thanks" after a person hands the chat back.
  if (id === 'menu:no') return out(START, [text(T.noThanks)]);

  // Menu and starting over.
  if (wantsMenu(t) && state.step !== 'confirm') return out(START, menu(ctx, true));
  if (id === 'menu:mine' || (wantsMine(t) && state.step !== 'confirm')) return done(await minePrompt(ctx));
  if (id === 'menu:same' || id === 'menu:book' || id === 'svc:other' || wantsBook(t)) {
    const stop = await limitPrompt(ctx);
    if (stop) return out(START, stop);
  }
  if (id === 'menu:same') {
    const last = ctx.client.last;
    const known = last && (await ctx.services()).some((s) => s.id === last.serviceId);
    if (last && known) return done(await dayPrompt(ctx, { step: 'day', serviceId: last.serviceId, mode: 'new' }));
    return out({ step: 'service' }, await servicePrompt(ctx));
  }
  if (id === 'menu:book' || id === 'svc:other' || wantsBook(t)) return out({ step: 'service' }, await servicePrompt(ctx));

  switch (state.step) {
    case 'service': {
      const svcs = await ctx.services();
      const chosen = id.startsWith('svc:') ? svcs.find((s) => s.id === id.slice(4)) : svcs.find((s) => t && (norm(s.name) === t || norm(s.name).includes(t) || (t.length >= 4 && t.includes(norm(s.name)))));
      if (!chosen) return (!id && (await understand(ctx, state, input))) || reprompt(ctx, state, id ? T.expired : T.noService);
      // They already said when they wanted it (and agreed), so carry on from there.
      if (state.hint) return applyHint(ctx, { ...state.hint, serviceId: chosen.id });
      return done(await dayPrompt(ctx, { step: 'day', serviceId: chosen.id, mode: 'new' }));
    }

    case 'understood': {
      if (id.startsWith('u:book:') && state.hint?.serviceId && state.hint.date) {
        const time = id.slice(7);
        const open = await ctx.times(state.hint.serviceId, state.hint.date);
        if (open.includes(time)) return done(await afterTime(ctx, { step: 'time', serviceId: state.hint.serviceId, date: state.hint.date, time, mode: 'new' }));
        return applyHint(ctx, { ...state.hint, time: undefined });
      }
      if (id === 'u:yes' || (!id && yes(t))) return state.hint ? applyHint(ctx, state.hint) : reprompt(ctx, START);
      if (id === 'u:no' || (!id && no(t))) return { state: { step: 'service' }, messages: await servicePrompt(ctx, T.pickYourself), effects: [] };
      // Typed a correction instead of tapping: read that instead.
      return (!id && (await understand(ctx, state, input))) || reprompt(ctx, state, id ? T.expired : T.notUnderstood);
    }

    case 'day': {
      if (id === 'keep') return out(START, [text(T.kept)]);
      if (id === 'day:more') return done(await dayPrompt(ctx, { ...state, dayPage: (state.dayPage ?? 0) + 1 }));
      if (id === 'day:list') return done(await dayPrompt(ctx, { ...state, dayPage: 0, seeAll: true }));
      if (id.startsWith('slot:')) {
        const [date, time] = id.slice(5).split('|');
        const open = date && time ? await ctx.times(state.serviceId!, date) : [];
        if (!open.includes(time)) return reprompt(ctx, state, T.expired);
        return done(await afterTime(ctx, { ...state, step: 'time', date, time }));
      }
      const days = (await ctx.days(state.serviceId!, state.mode === 'move' ? state.apptId : undefined)).map((d) => d.date);
      const date = id.startsWith('day:') ? (days.includes(id.slice(4)) ? id.slice(4) : null) : parseDay(input.type === 'text' ? input.text : '', days, ctx.now);
      if (!date) return (!id && ((await explainDay(ctx, state, input)) ?? (await understand(ctx, state, input)))) || reprompt(ctx, state, id ? T.expired : T.notUnderstood);
      return done(await timePrompt(ctx, { ...state, step: 'time', date }));
    }

    case 'time': {
      if (id.startsWith('period:')) return done(await timePrompt(ctx, { ...state, period: id.slice(7) as State['period'] }));
      if (id === 'time:day') return done(await dayPrompt(ctx, { ...state, step: 'day', date: undefined, period: undefined, dayPage: 0 }));
      const open = await ctx.times(state.serviceId!, state.date!, state.mode === 'move' ? state.apptId : undefined);
      const time = id.startsWith('time:') ? id.slice(5) : parseTime(input.type === 'text' ? input.text : '');
      if (!time) return (!id && (await understand(ctx, state, input))) || reprompt(ctx, state, id ? T.expired : T.notUnderstood);
      if (!open.includes(time)) return done(await timePrompt(ctx, { ...state, period: undefined }, undefined, { time, date: state.date! }));
      return done(await afterTime(ctx, { ...state, time }));
    }

    case 'name': {
      if (input.type !== 'text' || id) return reprompt(ctx, state, T.notUnderstood);
      const name = input.text.replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!name || /[\d@:/\\<>]/.test(name)) return reprompt(ctx, state, T.notUnderstood);
      ctx.client.name = name;
      ctx.client.nameConfirmed = true;
      const r = await holdThenConfirm(ctx, { ...state, step: 'confirm' });
      return { ...r, effects: [`name:${name}`] };
    }

    case 'confirm': {
      if (id === 'keep') return out(START, [text(T.kept)]);
      if (id === 'change' || (t && /^change/.test(t))) { await ctx.release?.(); return done(await timePrompt(ctx, { ...state, step: 'time', time: undefined, period: undefined })); }
      if (id === 'cancel' || no(t)) { await ctx.release?.(); return out(START, [text(T.notBooked), ...menu(ctx)]); }
      if (id === 'ok' || yes(t)) {
        const s = state;
        const res = s.mode === 'move' && s.apptId ? await ctx.move(s.apptId, s.date!, s.time!) : await ctx.book({ serviceId: s.serviceId!, date: s.date!, time: s.time! });
        if (!res.ok) return done(await timePrompt(ctx, { ...s, step: 'time', time: undefined, period: undefined }, undefined, { time: s.time!, date: s.date! }));
        const a = res.appt;
        const body = s.mode === 'move'
          ? T.moved(a.date, a.time, a.endTime, a.serviceName, a.staffName)
          : T.booked(ctx.client.name, a.serviceName, a.staffName, a.date, a.time, a.endTime, ctx.business.address);
        return out(START, [text(body)]);
      }
      return reprompt(ctx, state, T.notUnderstood);
    }

    case 'mine': {
      const a = id.startsWith('appt:') ? await ctx.appointment(id.slice(5)) : null;
      if (!a) return reprompt(ctx, state, id ? T.gone : T.notUnderstood);
      return done(managePrompt(a));
    }

    case 'manage': {
      const a = state.apptId ? await ctx.appointment(state.apptId) : null;
      if (!a) return out(START, [text(T.gone), ...menu(ctx)]);
      if (id === 'back') return done(await minePrompt(ctx));
      if (id === 'move') return done(await dayPrompt(ctx, { step: 'day', serviceId: a.serviceId, apptId: a.id, mode: 'move' }));
      if (id === 'cancelbk') return done(cancelPrompt(ctx, a));
      return reprompt(ctx, state, T.notUnderstood);
    }

    case 'cancel': {
      const a = state.apptId ? await ctx.appointment(state.apptId) : null;
      if (id === 'move' && a) return done(await dayPrompt(ctx, { step: 'day', serviceId: a.serviceId, apptId: a.id, mode: 'move' }));
      if (id === 'yes' || yes(t)) {
        const res = a ? await ctx.cancel(a.id) : { ok: false as const };
        return out(START, [text(res.ok && a ? T.cancelled(a.date, a.time) : T.gone)]);
      }
      if (id === 'no' || no(t)) return out(START, [text(T.kept)]);
      return reprompt(ctx, { step: 'manage', apptId: state.apptId }, T.notUnderstood);
    }

    default: {
      // Menu, or anything we don't understand: try to read it as a booking request, else offer the three safe options.
      const understood = state.step === 'menu' ? await understand(ctx, state, input) : null;
      if (understood) return understood;
      // A button from a conversation that has moved on (a double tap, or an old message): say so rather than "I didn't understand".
      if (id) return out(START, [text(T.expired), ...menu(ctx)]);
      return out(START, [lostMenu(T.notUnderstoodMenu)]);
    }
  }
}
