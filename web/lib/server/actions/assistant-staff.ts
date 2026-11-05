'use server';

import { z } from 'zod';
import { answerQuestion } from '../assistant/engine';
import { STAFF_DOMAIN, clearStaffCookie, emailAllowed, getStaff, linkToken } from '../assistant/staff';
import { clientInfo, rateLimit } from '../auth';
import { connectDB } from '../db';
import { sendEmail } from '../email';
import { env } from '../env';
import { Conversation, KnowledgeItem, KnowledgeSource } from '../models';
import type { Answer } from '@/lib/assistant/workspaces';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const WS = 'khumalo' as const;
const unauthorised = { ok: false as const, error: 'Please sign in again.' };

/* ---------- sign in ---------- */

const emailSchema = z.string().trim().toLowerCase().email().max(200);

/** Sends a one-time sign-in link to a work email. The demo business has no real inbox, so it also hands the link back. */
export async function requestStaffLinkAction(raw: string): Promise<Result<{ demoLink: string }>> {
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Enter your work email address.' };
  if (!emailAllowed(WS, parsed.data)) return { ok: false, error: `Only @${STAFF_DOMAIN[WS]} addresses can sign in. Check the address, or ask the owner to add you.` };
  const { ip } = await clientInfo();
  if (!(await rateLimit(`staff-link:${ip}`, 6, 60 * 60000))) return { ok: false, error: 'Too many sign-in requests. Please try again later.' };
  // One mailbox can't be flooded from many addresses either.
  if (!(await rateLimit(`staff-link-email:${parsed.data}`, 3, 60 * 60000))) return { ok: false, error: 'Too many sign-in requests for that address. Please try again later.' };

  const link = `${env.APP_URL}/projects/knowledge-chatbot/staff/verify?t=${linkToken(WS, parsed.data)}`;
  await sendEmail({
    to: parsed.data, subject: 'Your sign-in link for the Khumalo staff assistant',
    html: `<p>Use this link to sign in. It expires in 15 minutes.</p><p><a href="${link}">Sign in to the staff assistant</a></p><p>If you didn't ask for this, ignore this email.</p>`,
    text: `Use this link to sign in. It expires in 15 minutes.\n\n${link}\n\nIf you didn't ask for this, ignore this email.`,
  }).catch(() => false);
  return { ok: true, demoLink: link.replace(env.APP_URL, '') };
}

export async function signOutStaffAction(): Promise<Result> {
  await clearStaffCookie();
  return { ok: true };
}

/* ---------- chat ---------- */

const askSchema = z.object({
  question: z.string().trim().min(1).max(500),
  cid: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(600) })).max(6).default([]),
});

export async function staffAskAction(input: z.input<typeof askSchema>): Promise<Result<{ answer: Answer }>> {
  const staff = await getStaff();
  if (!staff) return unauthorised;
  const p = askSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Type a question first.' };
  const { ip } = await clientInfo();
  try {
    return { ok: true, answer: await answerQuestion(staff.workspace, p.data.question, ip, p.data.history, p.data.cid, 'staff', { email: staff.email, name: staff.name }) };
  } catch (e) {
    console.error('[assistant] staff answer failed:', (e as Error).message);
    return { ok: false, error: 'I couldn’t reach the documents just now. Please try again.' };
  }
}

/* ---------- history (private to the person who asked) ---------- */

export type HistoryRow = { id: string; title: string; source: string; lastAt: string; group: 'Today' | 'This week' | 'Earlier' };
export type HistoryChat = { id: string; cid: string; messages: { role: 'user' | 'assistant'; text: string; kind: string; sources: string[] }[] };

export async function staffHistoryAction(): Promise<Result<{ rows: HistoryRow[] }>> {
  const staff = await getStaff();
  if (!staff) return unauthorised;
  await connectDB();
  const docs = await Conversation.find({ workspace: staff.workspace, channel: 'staff', owner: staff.email }).sort({ lastAt: -1 }).limit(40).lean();
  const day = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
  const today = day(new Date());
  const rows = docs.map((c) => ({
    id: String(c._id), title: c.firstQuestion || c.messages[0]?.text || 'Question', source: (c.messages.find((m: { sources?: string[] }) => m.sources?.length)?.sources?.[0] ?? '').replace(/\.(pdf|docx?)$/i, ''), lastAt: c.lastAt.toISOString(),
    group: (day(c.lastAt) === today ? 'Today' : Date.now() - c.lastAt.getTime() < 7 * 86400000 ? 'This week' : 'Earlier') as HistoryRow['group'],
  }));
  return { ok: true, rows };
}

export async function staffConversationAction(id: string): Promise<Result<{ chat: HistoryChat }>> {
  const staff = await getStaff();
  if (!staff) return unauthorised;
  if (!/^[a-f0-9]{24}$/.test(id)) return { ok: false, error: 'Chat not found.' };
  await connectDB();
  const c = await Conversation.findOne({ _id: id, workspace: staff.workspace, owner: staff.email }).lean();
  if (!c) return { ok: false, error: 'Chat not found.' };
  return { ok: true, chat: { id: String(c._id), cid: c.cid, messages: c.messages.map((m: { role: string; text?: string | null; kind?: string | null; sources?: string[] }) => ({ role: m.role as 'user' | 'assistant', text: m.text ?? '', kind: m.kind ?? '', sources: m.sources ?? [] })) } };
}

/* ---------- source viewer ---------- */

export type SourceView = { title: string; kind: string; staffOnly: boolean; where: string; before: string[]; text: string; after: string[]; owner: string; updated: string };

/** The passage an answer used, with the items either side of it for context. */
export async function staffSourceAction(itemId: string): Promise<Result<{ view: SourceView }>> {
  const staff = await getStaff();
  if (!staff) return unauthorised;
  if (!/^[a-f0-9]{24}$/.test(itemId)) return { ok: false, error: 'Source not found.' };
  await connectDB();
  const item = await KnowledgeItem.findOne({ _id: itemId, workspace: staff.workspace, status: 'live' }).lean();
  if (!item) return { ok: false, error: 'That source is no longer live.' };
  const [src, siblings] = await Promise.all([
    KnowledgeSource.findOne({ workspace: staff.workspace, name: item.sourceName }).lean(),
    KnowledgeItem.find({ workspace: staff.workspace, sourceName: item.sourceName, status: 'live' }).sort({ order: 1 }).lean(),
  ]);
  const at = siblings.findIndex((s: { _id: unknown }) => String(s._id) === itemId);
  const kind = src?.type === 'web' ? 'WEB PAGE' : src?.type === 'typed' ? 'TYPED' : (src?.fileKind || 'FILE').toUpperCase();
  return {
    ok: true,
    view: {
      title: item.sourceName.replace(/\.(pdf|docx?)$/i, ''), kind, staffOnly: Boolean(item.staffOnly), where: item.where || '',
      before: siblings.slice(Math.max(0, at - 1), at).map((s: { text: string }) => s.text), text: item.text, after: siblings.slice(at + 1, at + 2).map((s: { text: string }) => s.text),
      owner: src?.createdBy || 'the owner', updated: (src?.updatedAt ?? item.updatedAt ?? new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Johannesburg' }),
    },
  };
}
