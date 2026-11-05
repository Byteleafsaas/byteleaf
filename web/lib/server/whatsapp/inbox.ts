import 'server-only';
import { Types } from 'mongoose';
import { redact } from '@/lib/assistant/redact';
import { maskPhone, hasNumber } from '@/lib/whatsapp/calendar-model';
import { T } from '@/lib/whatsapp/copy';
import { chatStatus, preview, whoLabel, windowState, type ChatStatus, type From } from '@/lib/whatsapp/inbox-model';
import type { Out } from '@/lib/whatsapp/types';
import { connectDB } from '../db';
import { WaAppointment, WaBusiness, WaChat, WaClient } from '../models';
import { BOOKING_SLUG } from './admin';
import { sendOut } from './send';

export type InboxChat = { id: string; name: string; phone: string; preview: string; at: string; status: ChatStatus; windowOpen: boolean };
export type InboxMessage = { who: string; from: From; text: string; at: string; by: string };
export type InboxData = {
  chats: InboxChat[];
  open: null | {
    id: string; name: string; phone: string; status: ChatStatus; takenBy: string;
    window: { open: boolean; hoursLeft: number; label: string };
    messages: InboxMessage[];
    /** Templates that can still be sent when the window is closed, for the client's next booking. */
    templates: { id: string; label: string }[];
  };
  /** Chats waiting for a person, for the badge in the sidebar. */
  waiting: number;
};

const stamp = (d: Date) => new Date(d.getTime() + 2 * 3600000).toISOString().replace('T', ' ').slice(5, 16); // "11-05 09:44" in SAST

export async function countWaiting(slug = BOOKING_SLUG): Promise<number> {
  await connectDB();
  return WaChat.countDocuments({ business: slug, needsHuman: true });
}

export async function loadInbox(selected: string, now = new Date()): Promise<InboxData> {
  await connectDB();
  const chats = await WaChat.find({ business: BOOKING_SLUG, 'messages.0': { $exists: true } }).sort({ updatedAt: -1 }).limit(50).lean();
  const clients = await WaClient.find({ _id: { $in: chats.map((c) => c.clientId) } }, { name: 1, phone: 1, lastInboundAt: 1 }).lean();
  const by = new Map(clients.map((c) => [String(c._id), c]));
  const rows: InboxChat[] = chats.map((c) => {
    const cl = by.get(String(c.clientId));
    const last = c.messages?.[c.messages.length - 1];
    return {
      id: String(c._id), name: cl?.name || 'Client', phone: maskPhone(cl?.phone ?? ''), preview: last ? preview(last.body ?? '') : '',
      at: stamp(c.updatedAt ?? now), status: chatStatus(c.state as { step?: string }, c.needsHuman), windowOpen: windowState(cl?.lastInboundAt, now).open,
    };
  });
  const waiting = chats.filter((c) => c.needsHuman).length;
  const sel = chats.find((c) => String(c._id) === selected);
  if (!sel) return { chats: rows, open: null, waiting };
  const cl = by.get(String(sel.clientId));
  const name = cl?.name || 'Client';
  const window = windowState(cl?.lastInboundAt, now);
  const next = await WaAppointment.findOne({ business: BOOKING_SLUG, clientId: sel.clientId, status: 'booked', startsAt: { $gt: now } }).sort({ startsAt: 1 }).lean();
  return {
    chats: rows, waiting,
    open: {
      id: String(sel._id), name, phone: maskPhone(cl?.phone ?? ''), status: chatStatus(sel.state as { step?: string }, sel.needsHuman), takenBy: sel.takenBy ?? '', window,
      messages: (sel.messages ?? []).map((m: { from?: From | null; by?: string | null; dir?: string | null; body?: string | null; at?: Date | null }) => ({ who: whoLabel(m, name), from: (m.from ?? (m.dir === 'in' ? 'client' : 'assistant')) as From, text: m.body ?? '', at: stamp(m.at ?? now), by: m.by ?? '' })),
      templates: window.open || !next ? [] : [{ id: 'salon-booked', label: 'Tell them their booking details' }],
    },
  };
}

type Sender = (phoneNumberId: string, to: string, messages: Out[]) => Promise<boolean>;
type Result = { ok: true; sent: boolean } | { ok: false; error: string };

async function ctxFor(chatId: string, now: Date) {
  const chat = await WaChat.findOne({ _id: chatId, business: BOOKING_SLUG });
  if (!chat) return null;
  const [client, biz] = await Promise.all([WaClient.findById(chat.clientId).lean(), WaBusiness.findOne({ slug: BOOKING_SLUG }, { phoneNumberId: 1, name: 1 }).lean()]);
  if (!client) return null;
  const win = windowState(client.lastInboundAt, now);
  return { chat, client, biz, win, canSend: Boolean(biz?.phoneNumberId) && hasNumber(client.phone) };
}

const log = (chat: InstanceType<typeof WaChat>, entries: { from: From; by?: string; body: string; kind: string }[], now: Date) =>
  WaChat.updateOne({ _id: chat._id }, { $push: { messages: { $each: entries.map((e) => ({ dir: 'out', from: e.from, by: e.by, body: e.body, kind: e.kind, at: now })), $slice: -200 } } });

/** The owner takes the chat: the assistant stays silent from now on, and the client is told who they are talking to. */
export async function takeOver(chatId: string, by: string, now = new Date(), send: Sender = sendOut): Promise<Result> {
  const c = await ctxFor(chatId, now);
  if (!c) return { ok: false, error: 'That chat no longer exists.' };
  const first = by.split(' ')[0];
  let sent = false;
  if (c.win.open && c.canSend) sent = await send(c.biz!.phoneNumberId!, c.client.phone, [{ type: 'text', body: T.tookOver(first) }]);
  await WaChat.updateOne({ _id: c.chat._id }, { $set: { state: { step: 'handover' }, needsHuman: false, takenBy: by } });
  if (sent) await log(c.chat, [{ from: 'assistant', body: T.tookOver(first), kind: 'text' }], now);
  return { ok: true, sent };
}

/** The owner's own message, sent as themselves. Only while they have the chat and the 24-hour window is open. */
export async function reply(chatId: string, by: string, text: string, now = new Date(), send: Sender = sendOut): Promise<Result> {
  const body = text.trim();
  if (!body) return { ok: false, error: 'Write a message first.' };
  if (body.length > 1000) return { ok: false, error: 'Keep it under 1000 characters.' };
  const c = await ctxFor(chatId, now);
  if (!c) return { ok: false, error: 'That chat no longer exists.' };
  if ((c.chat.state as { step?: string })?.step !== 'handover' || c.chat.needsHuman) return { ok: false, error: 'Take over the chat first, so the assistant stays quiet.' };
  if (!c.win.open) return { ok: false, error: 'Their 24-hour reply window has closed. You can only send a template now.' };
  if (!c.canSend) return { ok: false, error: c.biz?.phoneNumberId ? 'This client has no WhatsApp number on file.' : 'WhatsApp isn’t connected yet, so nothing can be sent.' };
  if (!(await send(c.biz!.phoneNumberId!, c.client.phone, [{ type: 'text', body }]))) return { ok: false, error: 'WhatsApp didn’t accept the message. Try again in a moment.' };
  await log(c.chat, [{ from: 'staff', by, body: redact(body), kind: 'text' }], now);
  return { ok: true, sent: true };
}

/** The owner hands the chat back: the assistant answers again, and (inside the window) says so with a menu. */
export async function handBack(chatId: string, by: string, now = new Date(), send: Sender = sendOut): Promise<Result> {
  const c = await ctxFor(chatId, now);
  if (!c) return { ok: false, error: 'That chat no longer exists.' };
  const first = by.split(' ')[0];
  const menu: Out = { type: 'buttons', body: T.handedBack(first), buttons: [{ id: 'menu:book', title: T.btnBook }, { id: 'menu:mine', title: T.btnMine }, { id: 'menu:no', title: T.btnNoThanks }] };
  let sent = false;
  if (c.win.open && c.canSend) sent = await send(c.biz!.phoneNumberId!, c.client.phone, [menu]);
  await WaChat.updateOne({ _id: c.chat._id }, { $set: { state: { step: 'menu' }, needsHuman: false, takenBy: '' } });
  if (sent) await log(c.chat, [{ from: 'assistant', body: menu.body, kind: 'buttons' }], now);
  return { ok: true, sent };
}

/** When the window is closed, the only thing we can send is an approved template: here, the details of their next booking. */
export async function sendTemplate(chatId: string, templateId: string, by: string, now = new Date()): Promise<Result> {
  if (templateId !== 'salon-booked') return { ok: false, error: 'That template doesn’t exist.' };
  const c = await ctxFor(chatId, now);
  if (!c) return { ok: false, error: 'That chat no longer exists.' };
  const appt = await WaAppointment.findOne({ business: BOOKING_SLUG, clientId: c.chat.clientId, status: 'booked', startsAt: { $gt: now } }).sort({ startsAt: 1 }).lean();
  if (!appt) return { ok: false, error: 'They have no upcoming booking to send details of.' };
  const { notifyClient } = await import('./manual');
  const r = await notifyClient(BOOKING_SLUG, String(c.chat.clientId), T.movedBySalon(c.biz?.name ?? '', appt.serviceName ?? '', appt.date, appt.time), now, { id: String(appt._id) });
  if (r !== 'sent') return { ok: false, error: r === 'not-connected' ? 'WhatsApp isn’t connected yet, so nothing can be sent.' : r === 'no-number' ? 'This client has no WhatsApp number on file.' : r === 'window-closed' ? 'The template for this isn’t set up on the server yet (WHATSAPP_SALON_TEMPLATE).' : 'WhatsApp didn’t accept the message.' };
  await log(c.chat, [{ from: 'staff', by, body: 'Sent their booking details (template)', kind: 'template' }], now);
  return { ok: true, sent: true };
}

export const isObjectId = (s: string) => Types.ObjectId.isValid(s);
