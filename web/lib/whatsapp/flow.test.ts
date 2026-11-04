import { describe, expect, it } from 'vitest';
import { START, step, type Appt, type Ctx, type State } from './flow';
import { fromMin, toMin } from './slots';
import type { Interpretation, Interpreter } from './understand';
import { validateOut, type Input, type Out } from './types';

const NOW = new Date('2026-11-06T08:00:00Z'); // Friday 6 Nov 2026, 10:00 in Johannesburg
const SERVICES = [
  { id: 'kn', name: 'Knotless braids', minutes: 240, priceCents: 65000 },
  { id: 'sp', name: 'Silk press', minutes: 90, priceCents: 38000 },
  { id: 'gn', name: 'Gel nails', minutes: 60, priceCents: 28000 },
];

/** A pretend salon: fixed open times per day, and a list of bookings that removes times as they are taken. */
function world(opts: { times?: Record<string, string[]>; isNew?: boolean; optedOut?: boolean } = {}) {
  const times: Record<string, string[]> = opts.times ?? { '2026-11-07': ['08:00', '11:00', '13:00'], '2026-11-10': ['09:00', '10:00'], '2026-11-11': ['09:00'] };
  const appts: Appt[] = [];
  let seq = 0;
  const mk = (serviceId: string, date: string, time: string): Appt => {
    const s = SERVICES.find((x) => x.id === serviceId)!;
    return { id: `a${++seq}`, serviceId, serviceName: s.name, date, time, endTime: fromMin(toMin(time) + s.minutes), priceCents: s.priceCents, startsAt: new Date(`${date}T${time}:00+02:00`) };
  };
  const open = (date: string) => (times[date] ?? []).filter((t) => !appts.some((a) => a.date === date && a.time === t));
  const ctx: Ctx = {
    business: { name: "Lerato's Braids & Beauty", cancelWindowHours: 24, replyNote: 'We usually reply within [X hours].', payNote: 'paid at the salon' },
    client: { name: 'Lindiwe', isNew: opts.isNew ?? false, optedOut: opts.optedOut ?? false },
    now: NOW,
    services: async () => SERVICES,
    days: async (_s, excl) => Object.keys(times).filter((d) => open(d).length || appts.some((a) => a.id === excl && a.date === d)).sort().map((d) => ({ date: d, count: open(d).length })),
    times: async (_s, d) => open(d),
    upcoming: async () => appts.filter((a) => a.startsAt > NOW),
    appointment: async (id) => appts.find((a) => a.id === id) ?? null,
    book: async (i) => (open(i.date).includes(i.time) ? { ok: true, appt: (appts.push(mk(i.serviceId, i.date, i.time)), appts[appts.length - 1]) } : { ok: false, reason: 'taken' }),
    move: async (id, date, time) => {
      const a = appts.find((x) => x.id === id);
      if (!a || !open(date).includes(time)) return { ok: false, reason: 'taken' };
      Object.assign(a, mk(a.serviceId, date, time), { id });
      return { ok: true, appt: a };
    },
    cancel: async (id) => {
      const i = appts.findIndex((x) => x.id === id);
      if (i === -1) return { ok: false };
      const late = appts[i].startsAt.getTime() - NOW.getTime() < 24 * 3600000;
      appts.splice(i, 1);
      return { ok: true, late };
    },
  };
  return { ctx, appts, times };
}

/** Runs inputs one after another, keeping the state, and checks every message would be accepted by WhatsApp. */
async function chat(ctx: Ctx, inputs: (string | { id: string })[], from: State = START) {
  let state = from;
  const log: { state: State; messages: Out[]; effects: string[] }[] = [];
  for (const raw of inputs) {
    const input: Input = typeof raw === 'string' ? { type: 'text', text: raw } : { type: 'reply', id: raw.id };
    const r = await step(state, input, ctx);
    for (const m of r.messages) expect(validateOut(m), JSON.stringify(m)).toEqual([]);
    state = r.state;
    log.push({ state, messages: r.messages, effects: r.effects });
  }
  return { state, log, last: log[log.length - 1] };
}
const bodies = (o: Out[]) => o.map((m) => m.body).join('\n');

describe('the booking conversation', () => {
  it('greets a new customer with the consent line and three buttons', async () => {
    const w = world({ isNew: true });
    const { last } = await chat(w.ctx, ['hi']);
    const m = last.messages[0];
    expect(m.type).toBe('buttons');
    expect(m.body).toContain('Reply STOP');
    expect(m.type === 'buttons' && m.buttons.map((b) => b.title)).toEqual(['Book appointment', 'My bookings', 'Talk to a person']);
  });

  it('takes a new customer who says "book" straight to the services, with the consent line first', async () => {
    const w = world({ isNew: true });
    const { last } = await chat(w.ctx, ['book']);
    expect(last.messages[0].body).toContain('Reply STOP');
    expect(last.messages[1].type).toBe('list');
    expect(last.state.step).toBe('service');
  });

  it('books an appointment by tapping through every step', async () => {
    const w = world();
    const { log } = await chat(w.ctx, [{ id: 'menu:book' }, { id: 'svc:kn' }, { id: 'day:2026-11-07' }, { id: 'time:08:00' }, { id: 'ok' }]);
    expect(log[0].messages[0].type).toBe('list');
    expect(bodies(log[2].messages)).toContain('Saturday 7 November');
    expect(bodies(log[3].messages)).toContain('08:00 to 12:00');
    expect(bodies(log[3].messages)).toContain('R 650');
    expect(bodies(log[4].messages)).toContain("You're booked, Lindiwe");
    expect(w.appts).toHaveLength(1);
    expect(w.appts[0]).toMatchObject({ serviceId: 'kn', date: '2026-11-07', time: '08:00' });
  });

  it('also works when the customer types instead of tapping', async () => {
    const w = world();
    await chat(w.ctx, ['book', 'knotless', 'saturday', '8am', 'yes']);
    expect(w.appts).toHaveLength(1);
    expect(w.appts[0]).toMatchObject({ date: '2026-11-07', time: '08:00' });
  });

  it('says so and offers the other times when a slot is taken before confirming', async () => {
    const w = world();
    const first = await chat(w.ctx, [{ id: 'menu:book' }, { id: 'svc:sp' }, { id: 'day:2026-11-07' }, { id: 'time:08:00' }]);
    w.appts.push({ id: 'x', serviceId: 'gn', serviceName: 'Gel nails', date: '2026-11-07', time: '08:00', endTime: '09:00', priceCents: 1, startsAt: new Date('2026-11-07T08:00:00+02:00') });
    const { last } = await chat(w.ctx, [{ id: 'ok' }], first.state);
    expect(bodies(last.messages)).toContain('just taken');
    const list = last.messages.find((m) => m.type === 'list');
    expect(list && list.type === 'list' && list.rows.map((r) => r.id)).not.toContain('time:08:00');
    expect(w.appts).toHaveLength(1); // only the other person's booking
  });

  it('asks morning, afternoon or evening when there are too many times for one list', async () => {
    const many = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00'];
    const w = world({ times: { '2026-11-07': many } });
    const { last } = await chat(w.ctx, [{ id: 'menu:book' }, { id: 'svc:gn' }, { id: 'day:2026-11-07' }]);
    const m = last.messages[0];
    expect(m.type).toBe('buttons');
    expect(m.type === 'buttons' && m.buttons.map((b) => b.title)).toEqual(['Morning', 'Afternoon']);
    const next = await chat(w.ctx, [{ id: 'period:morning' }], last.state);
    const list = next.last.messages[0];
    expect(list.type === 'list' && list.rows.length).toBeLessThanOrEqual(10);
  });

  it('pages through days when more than nine have space', async () => {
    const dates = Array.from({ length: 12 }, (_, i) => `2026-11-${String(10 + i).padStart(2, '0')}`);
    const w = world({ times: Object.fromEntries(dates.map((d) => [d, ['09:00']])) });
    const a = await chat(w.ctx, [{ id: 'menu:book' }, { id: 'svc:gn' }]);
    const first = a.last.messages[0];
    expect(first.type === 'list' && first.rows.at(-1)?.id).toBe('day:more');
    const b = await chat(w.ctx, [{ id: 'day:more' }], a.state);
    const second = b.last.messages[0];
    expect(second.type === 'list' && second.rows[0].id).toBe('day:2026-11-19');
  });

  it('lets the customer change the time of an existing booking', async () => {
    const w = world();
    await chat(w.ctx, ['book', 'silk press', 'saturday', '11:00', 'yes']);
    const id = w.appts[0].id;
    const r = await chat(w.ctx, [{ id: 'menu:mine' }, { id: `appt:${id}` }, { id: 'move' }, { id: 'day:2026-11-10' }, { id: 'time:09:00' }, { id: 'ok' }]);
    expect(bodies(r.last.messages)).toContain('Tuesday 10 November at 09:00');
    expect(w.appts).toHaveLength(1);
    expect(w.appts[0]).toMatchObject({ date: '2026-11-10', time: '09:00' });
  });

  it('warns about the cancellation window and cancels on confirmation', async () => {
    const w = world();
    await chat(w.ctx, ['book', 'gel nails', 'saturday', '8am', 'yes']); // tomorrow: inside 24 hours
    const id = w.appts[0].id;
    const ask = await chat(w.ctx, [{ id: 'menu:mine' }, { id: `appt:${id}` }, { id: 'cancelbk' }]);
    expect(bodies(ask.last.messages)).toContain('24-hour cancellation window');
    const done = await chat(w.ctx, [{ id: 'yes' }], ask.state);
    expect(bodies(done.last.messages)).toContain('cancelled');
    expect(w.appts).toHaveLength(0);
  });

  it('keeps a booking when the customer chooses to keep it', async () => {
    const w = world();
    await chat(w.ctx, ['book', 'gel nails', 'tue', '9', 'yes']);
    const id = w.appts[0].id;
    const r = await chat(w.ctx, [{ id: 'menu:mine' }, { id: `appt:${id}` }, { id: 'cancelbk' }, { id: 'no' }]);
    expect(bodies(r.last.messages)).toContain('stays as it is');
    expect(w.appts).toHaveLength(1);
  });

  it('handles taps on a reminder: confirm, change the time and cancel', async () => {
    const w = world();
    await chat(w.ctx, ['book', 'silk press', 'tue', '9', 'yes']);
    const id = w.appts[0].id;
    const ok = await chat(w.ctx, [{ id: 'remind:ok' }]);
    expect(bodies(ok.last.messages)).toContain('see you then');
    const move = await chat(w.ctx, [{ id: `remind:move:${id}` }, { id: 'day:2026-11-11' }, { id: 'time:09:00' }, { id: 'ok' }]);
    expect(bodies(move.last.messages)).toContain('Wednesday 11 November at 09:00');
    const cancel = await chat(w.ctx, [{ id: `remind:cancel:${id}` }, { id: 'yes' }]);
    expect(bodies(cancel.last.messages)).toContain('cancelled');
    expect(w.appts).toHaveLength(0);
    const gone = await chat(w.ctx, [{ id: 'remind:cancel:nope' }]);
    expect(bodies(gone.last.messages)).toContain("couldn't find that booking");
  });

  it('stops all messages after STOP and resumes after START', async () => {
    const w = world();
    const a = await chat(w.ctx, ['STOP']);
    expect(a.last.effects).toEqual(['optout']);
    expect(bodies(a.last.messages)).toContain('reply START');
    const quiet = world({ optedOut: true });
    const b = await chat(quiet.ctx, ['hello', 'book'], { step: 'optedout' });
    expect(b.log.every((l) => l.messages.length === 0)).toBe(true);
    const c = await chat(quiet.ctx, ['START'], { step: 'optedout' });
    expect(c.last.effects).toEqual(['optin']);
    expect(c.last.messages[0].type).toBe('text');
  });

  it('hands over to a person and stays quiet until the customer types MENU', async () => {
    const w = world();
    const a = await chat(w.ctx, [{ id: 'menu:person' }]);
    expect(a.last.effects).toEqual(['handover']);
    const b = await chat(w.ctx, ['thanks', 'hello?', 'are you there?'], a.state);
    expect(b.log.every((l) => l.messages.length === 0 && l.effects.length === 0)).toBe(true);
    const c = await chat(w.ctx, ['menu'], b.state);
    expect(c.last.messages[0].type).toBe('buttons');
    expect(c.state.step).toBe('menu');
  });

  it('answers a stale button by showing where the customer was', async () => {
    const w = world();
    const { last } = await chat(w.ctx, [{ id: 'menu:book' }, { id: 'time:09:00' }]);
    expect(bodies(last.messages)).toContain('expired');
    expect(last.messages.some((m) => m.type === 'list')).toBe(true);
    expect(last.state.step).toBe('service');
  });

  it('shows the menu when it does not understand', async () => {
    const w = world();
    const { last } = await chat(w.ctx, ['asdf qwerty']);
    expect(bodies(last.messages)).toContain("didn't catch that");
    expect(last.messages.at(-1)?.type).toBe('buttons');
  });

  it('offers a person when nothing is free', async () => {
    const w = world({ times: {} });
    const { last } = await chat(w.ctx, [{ id: 'menu:book' }, { id: 'svc:kn' }]);
    expect(bodies(last.messages)).toContain('Nothing is free');
    const m = last.messages.at(-1)!;
    expect(m.type === 'buttons' && m.buttons.map((b) => b.title)).toContain('Talk to a person');
  });

  it('says there is nothing to manage when there are no bookings', async () => {
    const w = world();
    const { last } = await chat(w.ctx, [{ id: 'menu:mine' }]);
    expect(bodies(last.messages)).toContain('no upcoming bookings');
  });
});

describe('typed requests read by the interpreter', () => {
  const asks = (found: Interpretation | null | 'throws') => {
    const calls: string[] = [];
    const interpret: Interpreter = async (text) => { calls.push(text); if (found === 'throws') throw new Error('down'); return found; };
    return { interpret, calls };
  };
  const withModel = (found: Interpretation | null | 'throws', opts: Parameters<typeof world>[0] = {}) => {
    const w = world(opts);
    const m = asks(found);
    return { ...w, ctx: { ...w.ctx, interpret: m.interpret }, calls: m.calls };
  };

  it('says back what it understood and books nothing until the customer confirms', async () => {
    const w = withModel({ serviceId: 'kn', date: '2026-11-07', window: 'morning' });
    const a = await chat(w.ctx, ['braids on saturday morning']);
    expect(w.calls).toEqual(['braids on saturday morning']);
    expect(a.state.step).toBe('understood');
    const m = a.last.messages[0];
    expect(m.body).toBe('I understood: Knotless braids, Saturday 7 November, morning. Is that right?');
    expect(m.type === 'buttons' && m.buttons.map((b) => b.title)).toEqual(["Yes, that's right", 'No, let me pick']);
    expect(w.appts).toHaveLength(0);

    const b = await chat(w.ctx, [{ id: 'u:yes' }], a.state);
    expect(b.state.step).toBe('time');
    const list = b.last.messages.find((x) => x.type === 'list');
    expect(list?.type === 'list' && list.rows.map((r) => r.id)).toEqual(['time:08:00', 'time:11:00', 'time:day']); // morning only
    expect(w.appts).toHaveLength(0);

    const c = await chat(w.ctx, [{ id: 'time:11:00' }], b.state);
    expect(c.state.step).toBe('confirm');
    expect(w.appts).toHaveLength(0);
    const d = await chat(w.ctx, [{ id: 'ok' }], c.state);
    expect(bodies(d.last.messages)).toContain("You're booked");
    expect(w.appts).toHaveLength(1);
    expect(w.appts[0]).toMatchObject({ serviceId: 'kn', date: '2026-11-07', time: '11:00' });
  });

  it('still tells the customer when the chosen time was taken in the meantime', async () => {
    const w = withModel({ serviceId: 'kn', date: '2026-11-07', time: '11:00' });
    const a = await chat(w.ctx, ['braids saturday 11']);
    const b = await chat(w.ctx, [{ id: 'u:yes' }], a.state);
    expect(b.state.step).toBe('confirm'); // exactly that time is open: straight to the final confirm, still unbooked
    expect(w.appts).toHaveLength(0);
    w.times['2026-11-07'] = ['08:00', '13:00']; // someone else got it
    const c = await chat(w.ctx, [{ id: 'ok' }], b.state);
    expect(bodies(c.last.messages)).toContain('just taken');
    expect(w.appts).toHaveLength(0);
  });

  it('asks for the service when only a day was understood, then continues to that day', async () => {
    const w = withModel({ date: '2026-11-07', window: 'afternoon' });
    const a = await chat(w.ctx, ['saturday afternoon please']);
    expect(a.last.messages[0].body).toBe('I understood: Saturday 7 November, afternoon. Is that right?');
    const b = await chat(w.ctx, [{ id: 'u:yes' }], a.state);
    expect(b.state.step).toBe('service');
    const c = await chat(w.ctx, [{ id: 'svc:sp' }], b.state);
    expect(c.state).toMatchObject({ step: 'time', serviceId: 'sp', date: '2026-11-07', period: 'afternoon' });
    const list = c.last.messages.find((x) => x.type === 'list');
    expect(list?.type === 'list' && list.rows.map((r) => r.id)).toEqual(['time:13:00', 'time:day']);
  });

  it('explains when the requested day is not open and offers the days that are', async () => {
    const w = withModel({ serviceId: 'kn', date: '2026-11-08' });
    const a = await chat(w.ctx, ['braids on sunday']);
    const b = await chat(w.ctx, [{ id: 'u:yes' }], a.state);
    expect(bodies(b.last.messages)).toContain('Nothing is open on Sunday 8 November');
    expect(b.state.step).toBe('day');
  });

  it('shows the whole day when nothing is open in the wished-for part of it', async () => {
    const w = withModel({ serviceId: 'kn', date: '2026-11-10', window: 'evening' });
    const a = await chat(w.ctx, ['braids tuesday evening']);
    const b = await chat(w.ctx, [{ id: 'u:yes' }], a.state);
    expect(bodies(b.last.messages)).toContain('Nothing is open in the evening');
    const list = b.last.messages.find((x) => x.type === 'list');
    expect(list?.type === 'list' && list.rows.map((r) => r.id)).toEqual(['time:09:00', 'time:10:00', 'time:day']);
  });

  it('goes back to the normal steps when the customer says it is wrong', async () => {
    const w = withModel({ serviceId: 'kn', date: '2026-11-07' });
    const a = await chat(w.ctx, ['braids on saturday']);
    const b = await chat(w.ctx, [{ id: 'u:no' }], a.state);
    expect(b.state.step).toBe('service');
    expect(b.last.messages.some((m) => m.type === 'list')).toBe(true);
    expect(w.appts).toHaveLength(0);
  });

  it('is honest that a named person cannot be picked yet', async () => {
    const w = withModel({ serviceId: 'kn', staff: 'Thandi' });
    const a = await chat(w.ctx, ['braids with thandi']);
    expect(a.last.messages[0].body).toContain("can't book a particular person");
  });

  it('refuses to offer a service that does not exist', async () => {
    const w = withModel({ serviceId: 'ghost' });
    const { last } = await chat(w.ctx, ['something odd']);
    expect(bodies(last.messages)).toContain("didn't catch that");
  });

  it('works inside the day and time steps too', async () => {
    const w = withModel({ date: '2026-11-10', window: 'morning' });
    const a = await chat(w.ctx, [{ id: 'menu:book' }, { id: 'svc:kn' }, 'the tuesday one after the weekend']);
    expect(a.state.step).toBe('understood');
    expect(a.state.hint).toMatchObject({ serviceId: 'kn', date: '2026-11-10' }); // keeps the service already chosen
  });

  it.each([['returns nothing', null], ['throws', 'throws' as const]])('falls back to the keyword parser when the interpreter %s', async (_n, found) => {
    const w = withModel(found);
    const a = await chat(w.ctx, ['asdf qwerty']);
    expect(bodies(a.last.messages)).toContain("didn't catch that");
    // Keywords alone still drive the whole booking.
    const b = await chat(w.ctx, [{ id: 'menu:book' }, 'knotless', 'sat', '11am', 'yes']);
    expect(b.state.step).toBe('menu');
    expect(w.appts).toHaveLength(1);
  });

  it('does not ask the interpreter when the keywords already understood', async () => {
    const w = withModel({ serviceId: 'sp' });
    await chat(w.ctx, [{ id: 'menu:book' }, 'knotless', 'sat', '11am']);
    expect(w.calls).toEqual([]);
  });

  it('does not use the interpreter for a brand new customer, who gets the consent greeting first', async () => {
    const w = withModel({ serviceId: 'kn' }, { isNew: true });
    const { last } = await chat(w.ctx, ['braids on saturday']);
    expect(w.calls).toEqual([]);
    expect(bodies(last.messages)).toContain('By chatting with me you agree');
  });

  it('never calls it while a person has the chat or after STOP', async () => {
    const w = withModel({ serviceId: 'kn' });
    await chat(w.ctx, ['hello?'], { step: 'handover' });
    await chat(w.ctx, ['stop']);
    expect(w.calls).toEqual([]);
  });
});
