import 'server-only';
import { Types } from 'mongoose';
import { START, step, type Appt, type Ctx, type State } from '@/lib/whatsapp/flow';
import { fromMin, toMin } from '@/lib/whatsapp/slots';
import { validateOut, type Input, type Out } from '@/lib/whatsapp/types';
import { todaySast } from '../time';
import { connectDB } from '../db';
import { WaAppointment, WaChat, WaClient } from '../models';
import { makeInterpreter } from './understand';
import { bookSlot, cancelSlot, daysFor, loadData, moveSlot, timesFor, type Booked, type Data } from './calendar';

export type Source = 'whatsapp' | 'simulator';

/** Digits only, with South African numbers written 0821234567 turned into 27821234567. */
export function normPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  return d.startsWith('0') ? `27${d.slice(1)}` : d;
}

const endOf = (startsAt: Date, endsAt: Date, time: string) => fromMin(toMin(time) + Math.round((endsAt.getTime() - startsAt.getTime()) / 60000));

const toAppt = (a: { _id: unknown; serviceId: unknown; serviceName?: string | null; date: string; time: string; startsAt: Date; endsAt: Date; priceCents?: number | null }): Appt => ({
  id: String(a._id), serviceId: String(a.serviceId), serviceName: a.serviceName ?? '', date: a.date, time: a.time, endTime: endOf(a.startsAt, a.endsAt, a.time), priceCents: a.priceCents ?? 0, startsAt: a.startsAt,
});

const fromBooked = (b: Booked): Appt => ({ id: String(b.id), serviceId: String(b.serviceId), serviceName: b.serviceName, date: b.date, time: b.time, endTime: endOf(b.startsAt, b.endsAt, b.time), priceCents: b.priceCents, startsAt: b.startsAt });

/** Wires the conversation to the real calendar for one customer. */
function makeCtx(d: Data, client: { id: Types.ObjectId; name: string; phone: string; isNew: boolean; optedOut: boolean }, now: Date, source: Source): Ctx {
  const svc = (id: string) => d.services.find((s) => String(s.id) === id);
  return {
    business: { name: d.biz.name, cancelWindowHours: d.biz.cancelWindowHours, replyNote: d.biz.replyNote, payNote: d.biz.payNote },
    client: { name: client.name || undefined, isNew: client.isNew, optedOut: client.optedOut },
    now,
    interpret: makeInterpreter(d, todaySast(now)),
    services: async () => d.services.map((s) => ({ id: String(s.id), name: s.name, minutes: s.minutes, priceCents: s.priceCents })),
    days: async (serviceId, excl) => { const s = svc(serviceId); return s ? daysFor(d, s, now, excl) : []; },
    times: async (serviceId, date, excl) => { const s = svc(serviceId); return s ? timesFor(d, s, date, now, excl) : []; },
    upcoming: async () => (await WaAppointment.find({ business: d.biz.slug, clientId: client.id, status: 'booked', startsAt: { $gt: now } }).sort({ startsAt: 1 }).limit(10).lean()).map(toAppt),
    appointment: async (id) => {
      if (!Types.ObjectId.isValid(id)) return null;
      const a = await WaAppointment.findOne({ _id: id, business: d.biz.slug, clientId: client.id, status: 'booked' }).lean();
      return a ? toAppt(a) : null;
    },
    book: async ({ serviceId, date, time }) => {
      const s = svc(serviceId);
      if (!s) return { ok: false, reason: 'invalid' };
      const r = await bookSlot(d, s, client, date, time, now, source);
      return r === 'taken' ? { ok: false, reason: 'taken' } : { ok: true, appt: fromBooked(r) };
    },
    move: async (apptId, date, time) => {
      const own = await WaAppointment.exists({ _id: apptId, clientId: client.id });
      if (!own) return { ok: false, reason: 'invalid' };
      const r = await moveSlot(d, apptId, date, time, now);
      return r === 'taken' || r === 'gone' ? { ok: false, reason: r === 'taken' ? 'taken' : 'invalid' } : { ok: true, appt: fromBooked(r) };
    },
    cancel: async (apptId) => {
      const own = await WaAppointment.exists({ _id: apptId, clientId: client.id });
      if (!own) return { ok: false };
      const r = await cancelSlot(d, apptId, now);
      return r ? { ok: true, late: r.late } : { ok: false };
    },
  };
}

export type InboundResult = { messages: Out[]; clientId: string; unknownBusiness?: boolean };

/**
 * One message from a customer: find or create them, run the conversation, save what happened and return the replies.
 * The same function serves the real WhatsApp webhook and the demo simulator.
 */
export async function handleInbound(o: { slug: string; phone: string; name?: string; input: Input; source: Source; now?: Date }): Promise<InboundResult> {
  const now = o.now ?? new Date();
  const d = await loadData(o.slug);
  if (!d) return { messages: [], clientId: '', unknownBusiness: true };
  await connectDB();

  const phone = normPhone(o.phone);
  const client = await WaClient.findOneAndUpdate(
    { business: o.slug, phone },
    { $setOnInsert: { business: o.slug, phone }, $set: { lastInboundAt: now, ...(o.name ? { name: o.name.slice(0, 80) } : {}) } },
    { upsert: true, returnDocument: 'after' },
  );
  const chat = await WaChat.findOneAndUpdate({ business: o.slug, clientId: client._id }, { $setOnInsert: { business: o.slug, clientId: client._id, state: START } }, { upsert: true, returnDocument: 'after' });

  const inbound = o.input.type === 'text' ? o.input.text.slice(0, 1000) : o.input.title ?? o.input.id;
  const ctx = makeCtx(d, { id: client._id as Types.ObjectId, name: client.name, phone, isNew: !client.greeted, optedOut: client.optedOut }, now, o.source);

  let result;
  try {
    result = await step((chat.state as State) ?? START, o.input, ctx);
  } catch (e) {
    console.error('[whatsapp] conversation failed:', (e as Error).message);
    result = { state: START, messages: [{ type: 'text', body: 'Sorry, something went wrong on our side. Please try again in a moment, or type MENU to start again.' } as Out], effects: [] as string[] };
  }

  // WhatsApp would reject a message that breaks its limits. Never send one: fall back to plain text.
  const messages = result.messages.map((m) => {
    const problems = validateOut(m);
    if (!problems.length) return m;
    console.error('[whatsapp] dropped an invalid message:', problems.join(' '));
    return { type: 'text', body: m.body.slice(0, 1000) } as Out;
  });

  const clientSet: Record<string, unknown> = {};
  if (result.effects.includes('optout')) Object.assign(clientSet, { optedOut: true, optedOutAt: now });
  if (result.effects.includes('optin')) Object.assign(clientSet, { optedOut: false, optedOutAt: null });
  if (messages.length) clientSet.greeted = true;
  if (Object.keys(clientSet).length) await WaClient.updateOne({ _id: client._id }, { $set: clientSet });

  const log = [{ dir: 'in', body: inbound, kind: o.input.type, at: now }, ...messages.map((m) => ({ dir: 'out', body: m.body, kind: m.type, at: now }))];
  await WaChat.updateOne(
    { _id: chat._id },
    {
      $set: { state: result.state, lastInboundAt: now, needsHuman: result.effects.includes('handover') ? true : result.state.step === 'handover' ? chat.needsHuman : false },
      $push: { messages: { $each: log, $slice: -200 } },
    },
  );
  return { messages, clientId: String(client._id) };
}
