// The booking conversation as a state machine. Given where the customer is, and what they just did, it says what to
// reply and where they are now. It never touches the database or WhatsApp: everything it needs comes in through `Ctx`,
// so every path can be tested with a pretend calendar.
import { T, clip, fmtDay, fmtLength, fmtLong, fmtMoney, rowTitle } from './copy';
import { isStart, isStop, no, norm, parseDay, parseTime, wantsBook, wantsMenu, wantsMine, wantsPerson, yes } from './parse';
import { fromMin, toMin } from './slots';
import { LIMITS, type Input, type Out, type Row } from './types';
import type { Interpretation, Interpreter } from './understand';

export type Svc = { id: string; name: string; minutes: number; priceCents: number };
export type Appt = { id: string; serviceId: string; serviceName: string; date: string; time: string; endTime: string; priceCents: number; startsAt: Date };

export type BookResult = { ok: true; appt: Appt } | { ok: false; reason: 'taken' | 'invalid' };

/** Everything the conversation needs from the outside world. */
export type Ctx = {
  business: { name: string; cancelWindowHours: number; replyNote: string; payNote: string };
  client: { name?: string; isNew: boolean; optedOut: boolean };
  now: Date;
  /** Reads typed free text ("braids on Saturday morning"). Absent, or returning null, means the keyword parser alone is used. */
  interpret?: Interpreter;
  services(): Promise<Svc[]>;
  /** Dates with at least one free start, soonest first. */
  days(serviceId: string, excludeApptId?: string): Promise<{ date: string; count: number }[]>;
  times(serviceId: string, date: string, excludeApptId?: string): Promise<string[]>;
  upcoming(): Promise<Appt[]>;
  appointment(id: string): Promise<Appt | null>;
  book(i: { serviceId: string; date: string; time: string }): Promise<BookResult>;
  move(apptId: string, date: string, time: string): Promise<BookResult>;
  cancel(apptId: string): Promise<{ ok: true; late: boolean } | { ok: false }>;
};

export type Step = 'menu' | 'service' | 'day' | 'time' | 'confirm' | 'understood' | 'mine' | 'manage' | 'cancel' | 'handover' | 'optedout';
export type State = { step: Step; /** What we think a typed request meant, waiting for the customer to say yes */ hint?: Interpretation; serviceId?: string; date?: string; time?: string; apptId?: string; /** 'move' while changing an existing booking */ mode?: 'new' | 'move'; dayPage?: number; period?: 'morning' | 'afternoon' | 'evening' };
export type Effect = 'handover' | 'optout' | 'optin';
export type Result = { state: State; messages: Out[]; effects: Effect[] };

export const START: State = { step: 'menu' };

const text = (body: string): Out => ({ type: 'text', body });
const PAGE = LIMITS.listRows - 1; // leave one row for "More days" / "Pick another day"
const periodOf = (t: string) => (toMin(t) < 12 * 60 ? 'morning' : toMin(t) < 17 * 60 ? 'afternoon' : 'evening');

/** The menu, with the longer welcome for someone new. */
function menu(ctx: Ctx, welcome = false): Out[] {
  const body = welcome && ctx.client.isNew ? T.greetNew(ctx.business.name) : welcome ? T.greetBack(ctx.client.name) : T.menuBody;
  return [{ type: 'buttons', body, buttons: [{ id: 'menu:book', title: T.btnBook }, { id: 'menu:mine', title: T.btnMine }, { id: 'menu:person', title: T.btnPerson }] }];
}

async function servicePrompt(ctx: Ctx, lead?: string): Promise<Out[]> {
  const svcs = await ctx.services();
  const rows: Row[] = svcs.slice(0, LIMITS.listRows).map((s) => ({ id: `svc:${s.id}`, title: rowTitle(s.name), description: `${fmtLength(s.minutes)} · ${fmtMoney(s.priceCents)}` }));
  return [...(lead ? [text(lead)] : []), { type: 'list', body: T.chooseService, button: T.serviceButton, rows }];
}

async function dayPrompt(ctx: Ctx, s: State, lead?: string): Promise<{ state: State; messages: Out[] }> {
  const svc = (await ctx.services()).find((x) => x.id === s.serviceId);
  const days = await ctx.days(s.serviceId!, s.mode === 'move' ? s.apptId : undefined);
  if (!svc || !days.length) {
    return { state: { step: 'menu' }, messages: [...(lead ? [text(lead)] : []), { type: 'buttons', body: T.noDays, buttons: [{ id: 'menu:person', title: T.btnPerson }, { id: 'menu:book', title: T.btnBook }] }] };
  }
  const page = s.dayPage ?? 0;
  const slice = days.slice(page * PAGE, page * PAGE + PAGE);
  const rows: Row[] = slice.map((d) => ({ id: `day:${d.date}`, title: fmtDay(d.date), description: `${d.count} time${d.count === 1 ? '' : 's'} open` }));
  if (days.length > (page + 1) * PAGE) rows.push({ id: 'day:more', title: T.moreDays });
  return { state: { ...s, step: 'day', dayPage: page }, messages: [...(lead ? [text(lead)] : []), { type: 'list', body: T.dayBody(svc.name, fmtLength(svc.minutes), fmtMoney(svc.priceCents)), button: T.dayButton, rows }] };
}

async function timePrompt(ctx: Ctx, s: State, lead?: string): Promise<{ state: State; messages: Out[] }> {
  const all = await ctx.times(s.serviceId!, s.date!, s.mode === 'move' ? s.apptId : undefined);
  const svc = (await ctx.services()).find((x) => x.id === s.serviceId);
  if (!all.length || !svc) return dayPrompt(ctx, { ...s, date: undefined, time: undefined, period: undefined }, T.taken);
  // A wished-for part of the day with nothing open in it: show the whole day instead of an empty list.
  if (s.period && !all.some((t) => periodOf(t) === s.period)) return timePrompt(ctx, { ...s, period: undefined }, lead ?? T.noneThen(T.periodWord[s.period]));
  const lead1 = lead ? [text(lead)] : [];
  // Many times open: ask morning, afternoon or evening first, so the list stays short enough for WhatsApp.
  if (all.length > PAGE && !s.period) {
    const periods = (['morning', 'afternoon', 'evening'] as const).filter((p) => all.some((t) => periodOf(t) === p));
    if (periods.length > 1) {
      const label = { morning: T.morning, afternoon: T.afternoon, evening: T.evening };
      return { state: { ...s, step: 'time' }, messages: [...lead1, { type: 'buttons', body: T.periodBody(s.date!), buttons: periods.map((p) => ({ id: `period:${p}`, title: label[p] })) }] };
    }
  }
  let times = s.period ? all.filter((t) => periodOf(t) === s.period) : all;
  if (times.length > PAGE) times = Array.from({ length: PAGE }, (_, i) => times[Math.round((i * (times.length - 1)) / (PAGE - 1))]);
  const rows: Row[] = [...times.map((t) => ({ id: `time:${t}`, title: t, description: `to ${fromMin(toMin(t) + svc.minutes)}` })), { id: 'time:day', title: T.otherDay }];
  return { state: { ...s, step: 'time' }, messages: [...lead1, { type: 'list', body: T.timeBody(s.date!), button: T.timeButton, rows }] };
}

async function confirmPrompt(ctx: Ctx, s: State): Promise<{ state: State; messages: Out[] }> {
  const svc = (await ctx.services()).find((x) => x.id === s.serviceId)!;
  const end = fromMin(toMin(s.time!) + svc.minutes);
  const body = T.confirmBody(svc.name, s.date!, s.time!, end, fmtMoney(svc.priceCents), ctx.business.payNote);
  return { state: { ...s, step: 'confirm' }, messages: [{ type: 'buttons', body, buttons: [{ id: 'ok', title: T.confirmBtn }, { id: 'change', title: T.changeTime }, { id: 'cancel', title: T.cancelBtn }] }] };
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

/** Says back what we think the customer meant and asks them to tap yes or no. Nothing is booked from this. */
async function understoodPrompt(ctx: Ctx, hint: Interpretation): Promise<{ state: State; messages: Out[] }> {
  const svc = hint.serviceId ? (await ctx.services()).find((x) => x.id === hint.serviceId) : undefined;
  const parts = [svc?.name, hint.date && fmtLong(hint.date), hint.time ?? (hint.window && T.periodWord[hint.window])].filter((p): p is string => Boolean(p));
  const body = T.understood(parts, hint.staff ? T.staffNote(hint.staff) : undefined);
  return { state: { step: 'understood', hint }, messages: [{ type: 'buttons', body, buttons: [{ id: 'u:yes', title: T.btnUnderstoodYes }, { id: 'u:no', title: T.btnUnderstoodNo }] }] };
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
  return { ...(await understoodPrompt(ctx, hint)), effects: [] };
}

/** The customer said yes to what we understood: carry on to the same day and time choices as if they had tapped through. */
async function applyHint(ctx: Ctx, hint: Interpretation): Promise<Result> {
  const done = (r: { state: State; messages: Out[] }): Result => ({ ...r, effects: [] });
  if (!hint.serviceId) return { state: { step: 'service', hint }, messages: await servicePrompt(ctx), effects: [] };
  const base: State = { step: 'day', serviceId: hint.serviceId, mode: 'new', period: hint.window ?? (hint.time ? periodOf(hint.time) : undefined) };
  if (!hint.date) return done(await dayPrompt(ctx, base));
  const days = (await ctx.days(hint.serviceId)).map((d) => d.date);
  if (!days.includes(hint.date)) return done(await dayPrompt(ctx, base, T.dayClosed(hint.date)));
  const open = await ctx.times(hint.serviceId, hint.date);
  if (hint.time && open.includes(hint.time)) return done(await confirmPrompt(ctx, { ...base, date: hint.date, time: hint.time }));
  return done(await timePrompt(ctx, { ...base, step: 'time', date: hint.date }, hint.time ? T.timeNotOpen(hint.time) : undefined));
}

/** Asks the question for wherever the customer currently is. Used to carry on after a mistake or a stale button. */
async function reprompt(ctx: Ctx, s: State, lead?: string): Promise<Result> {
  const done = (r: { state: State; messages: Out[] }): Result => ({ ...r, effects: [] });
  switch (s.step) {
    case 'service': return { state: s, messages: await servicePrompt(ctx, lead), effects: [] };
    case 'day': return done(await dayPrompt(ctx, s, lead));
    case 'time': return done(await timePrompt(ctx, s, lead));
    case 'confirm': { const r = await confirmPrompt(ctx, s); return done({ ...r, messages: [...(lead ? [text(lead)] : []), ...r.messages] }); }
    case 'understood': { if (!s.hint) return { state: START, messages: menu(ctx), effects: [] }; const r = await understoodPrompt(ctx, s.hint); return done({ ...r, messages: [...(lead ? [text(lead)] : []), ...r.messages] }); }
    case 'mine': { const r = await minePrompt(ctx); return done({ ...r, messages: [...(lead ? [text(lead)] : []), ...r.messages] }); }
    case 'manage': { const a = s.apptId ? await ctx.appointment(s.apptId) : null; if (!a) return { state: START, messages: [text(T.gone), ...menu(ctx)], effects: [] }; const r = managePrompt(a); return done({ ...r, messages: [...(lead ? [text(lead)] : []), ...r.messages] }); }
    default: return { state: START, messages: [...(lead ? [text(lead)] : []), ...menu(ctx)], effects: [] };
  }
}

/** One turn of the conversation. */
export async function step(state: State, input: Input, ctx: Ctx): Promise<Result> {
  const t = input.type === 'text' ? norm(input.text) : '';
  const id = input.type === 'reply' ? input.id : '';
  const out = (s: State, messages: Out[], effects: Effect[] = []): Result => ({ state: s, messages, effects });

  // Stop and start work everywhere, whatever else is going on.
  if (isStop(t)) return out({ step: 'optedout' }, [text(T.stop)], ['optout']);
  if (ctx.client.optedOut || state.step === 'optedout') {
    if (isStart(t)) return out(START, [text(T.start), ...menu(ctx)], ['optin']);
    return out({ step: 'optedout' }, []); // they asked not to be messaged, so we stay quiet
  }

  // Taps on a reminder: confirm, change the time or cancel. These work whatever the customer was doing before.
  if (id.startsWith('remind:')) {
    const [, action, apptId] = id.split(':');
    if (action === 'ok') return out(state.step === 'handover' ? state : START, [text(T.seeYou)]);
    const a = apptId ? await ctx.appointment(apptId) : null;
    if (!a) return out(START, [text(T.gone), ...menu(ctx)]);
    if (action === 'move') { const r = await dayPrompt(ctx, { step: 'day', serviceId: a.serviceId, apptId: a.id, mode: 'move' }); return { ...r, effects: [] }; }
    if (action === 'cancel') {
      const late = a.startsAt.getTime() - ctx.now.getTime() < ctx.business.cancelWindowHours * 3600000;
      return out({ step: 'cancel', apptId: a.id }, [{ type: 'buttons', body: T.cancelAsk(late, ctx.business.cancelWindowHours), buttons: [{ id: 'yes', title: T.btnYesCancel }, { id: 'no', title: T.btnKeep }] }]);
    }
  }

  // A person has the chat. A greeting or a question is for them, so the assistant stays quiet. Only MENU hands it back.
  if (state.step === 'handover') return /^(menu|bot|start over|restart)$/.test(t) ? out(START, menu(ctx)) : out(state, []);

  // First hello, or "menu" from anywhere.
  if (ctx.client.isNew && state.step === 'menu' && !id) {
    // Someone new who opens with "book" gets the consent line and goes straight to the services, with no extra tap.
    if (wantsBook(t)) return out({ step: 'service' }, [text(T.greetNew(ctx.business.name)), ...(await servicePrompt(ctx))]);
    return out(START, menu(ctx, true));
  }
  if (wantsMenu(t) && state.step !== 'confirm') return out(START, menu(ctx, ctx.client.isNew));
  if (id === 'menu:person' || wantsPerson(t)) return out({ step: 'handover' }, [text(T.handover(ctx.business.replyNote))], ['handover']);
  if (id === 'menu:mine' || wantsMine(t) && state.step !== 'confirm') { const r = await minePrompt(ctx); return { ...r, effects: [] }; }
  if (id === 'menu:book' || wantsBook(t)) return out({ step: 'service' }, await servicePrompt(ctx));

  switch (state.step) {
    case 'service': {
      const svcs = await ctx.services();
      const chosen = id.startsWith('svc:') ? svcs.find((s) => s.id === id.slice(4)) : svcs.find((s) => t && (norm(s.name) === t || norm(s.name).includes(t) || (t.length >= 4 && t.includes(norm(s.name)))));
      if (!chosen) return (!id && (await understand(ctx, state, input))) || reprompt(ctx, state, id ? T.expired : T.noService);
      // They already said when they wanted it (and agreed), so carry on from there.
      if (state.hint) return applyHint(ctx, { ...state.hint, serviceId: chosen.id });
      const r = await dayPrompt(ctx, { step: 'day', serviceId: chosen.id, mode: 'new' });
      return { ...r, effects: [] };
    }

    case 'understood': {
      if (id === 'u:yes' || (!id && yes(t))) return state.hint ? applyHint(ctx, state.hint) : reprompt(ctx, START);
      if (id === 'u:no' || (!id && no(t))) return { state: { step: 'service' }, messages: await servicePrompt(ctx, T.pickYourself), effects: [] };
      // Typed a correction instead of tapping: read that instead.
      return (!id && (await understand(ctx, state, input))) || reprompt(ctx, state, id ? T.expired : T.notUnderstood);
    }

    case 'day': {
      if (id === 'day:more') { const r = await dayPrompt(ctx, { ...state, dayPage: (state.dayPage ?? 0) + 1 }); return { ...r, effects: [] }; }
      const days = (await ctx.days(state.serviceId!, state.mode === 'move' ? state.apptId : undefined)).map((d) => d.date);
      const date = id.startsWith('day:') ? (days.includes(id.slice(4)) ? id.slice(4) : null) : parseDay(input.type === 'text' ? input.text : '', days, ctx.now);
      if (!date) return (!id && (await understand(ctx, state, input))) || reprompt(ctx, state, id ? T.expired : T.notUnderstood);
      const r = await timePrompt(ctx, { ...state, step: 'time', date });
      return { ...r, effects: [] };
    }

    case 'time': {
      if (id.startsWith('period:')) { const r = await timePrompt(ctx, { ...state, period: id.slice(7) as State['period'] }); return { ...r, effects: [] }; }
      if (id === 'time:day') { const r = await dayPrompt(ctx, { ...state, step: 'day', date: undefined, period: undefined, dayPage: 0 }); return { ...r, effects: [] }; }
      const open = await ctx.times(state.serviceId!, state.date!, state.mode === 'move' ? state.apptId : undefined);
      const time = id.startsWith('time:') ? id.slice(5) : parseTime(input.type === 'text' ? input.text : '');
      if (!time) return (!id && (await understand(ctx, state, input))) || reprompt(ctx, state, id ? T.expired : T.notUnderstood);
      if (!open.includes(time)) return reprompt(ctx, { ...state, period: undefined }, T.taken);
      const r = await confirmPrompt(ctx, { ...state, time });
      return { ...r, effects: [] };
    }

    case 'confirm': {
      if (id === 'change' || (t && /^change/.test(t))) { const r = await timePrompt(ctx, { ...state, step: 'time', time: undefined, period: undefined }); return { ...r, effects: [] }; }
      if (id === 'cancel' || no(t)) return out(START, [text(T.notBooked), ...menu(ctx)]);
      if (id === 'ok' || yes(t)) {
        const s = state;
        const res = s.mode === 'move' && s.apptId ? await ctx.move(s.apptId, s.date!, s.time!) : await ctx.book({ serviceId: s.serviceId!, date: s.date!, time: s.time! });
        if (!res.ok) {
          const r = await timePrompt(ctx, { ...s, step: 'time', time: undefined, period: undefined }, T.taken);
          return { ...r, effects: [] };
        }
        const a = res.appt;
        return out(START, [text(s.mode === 'move' ? T.moved(a.serviceName, a.date, a.time) : T.booked(ctx.client.name, a.serviceName, a.date, a.time))]);
      }
      return reprompt(ctx, state, T.notUnderstood);
    }

    case 'mine': {
      const a = id.startsWith('appt:') ? await ctx.appointment(id.slice(5)) : null;
      if (!a) return reprompt(ctx, state, id ? T.gone : T.notUnderstood);
      return { ...managePrompt(a), effects: [] };
    }

    case 'manage': {
      const a = state.apptId ? await ctx.appointment(state.apptId) : null;
      if (!a) return out(START, [text(T.gone), ...menu(ctx)]);
      if (id === 'back') { const r = await minePrompt(ctx); return { ...r, effects: [] }; }
      if (id === 'move') {
        const r = await dayPrompt(ctx, { step: 'day', serviceId: a.serviceId, apptId: a.id, mode: 'move' });
        return { ...r, effects: [] };
      }
      if (id === 'cancelbk') {
        const late = a.startsAt.getTime() - ctx.now.getTime() < ctx.business.cancelWindowHours * 3600000;
        return out({ step: 'cancel', apptId: a.id }, [{ type: 'buttons', body: T.cancelAsk(late, ctx.business.cancelWindowHours), buttons: [{ id: 'yes', title: T.btnYesCancel }, { id: 'no', title: T.btnKeep }] }]);
      }
      return reprompt(ctx, state, T.notUnderstood);
    }

    case 'cancel': {
      if (id === 'yes' || yes(t)) {
        const res = state.apptId ? await ctx.cancel(state.apptId) : { ok: false as const };
        return out(START, [text(res.ok ? T.cancelled : T.gone), ...menu(ctx)]);
      }
      if (id === 'no' || no(t)) return out(START, [text(T.kept), ...menu(ctx)]);
      return reprompt(ctx, { step: 'manage', apptId: state.apptId }, T.notUnderstood);
    }

    default:
      // Menu, or anything we don't understand: try to read it as a booking request, else show the options again.
      const understood = state.step === 'menu' ? await understand(ctx, state, input) : null;
      if (understood) return understood;
      return out(START, [text(T.notUnderstood), ...menu(ctx)]);
  }
}
