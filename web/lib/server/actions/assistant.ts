'use server';

import { z } from 'zod';
import { isWorkspaceId, WORKSPACES, type Answer } from '@/lib/assistant/workspaces';
import { answerQuestion } from '../assistant/engine';
import { clientInfo, rateLimit } from '../auth';
import { connectDB } from '../db';
import { mail } from '../emails';
import { toSettings } from '../mappers';
import { redact } from '@/lib/assistant/redact';
import { AssistantFeedback, Conversation, Handover, Message, Unanswered } from '../models';
import { getAssistantSettings } from '../assistant/settings';
import { getStaff } from '../assistant/staff';
import { getSettingsDoc } from '../settings';

type Result = { ok: true } | { ok: false; error: string };
const trim = (max: number) => z.string().trim().max(max);
const workspace = z.string().refine(isWorkspaceId, 'Unknown assistant.');
const cid = z.string().regex(/^[a-zA-Z0-9-]{8,64}$/);

// Staff mode shows internal documents, so a real client needs staff sign-in first. The demo business is made up, so its staff mode is open.
const DEMO_WORKSPACES = ['khumalo'];
const staffAllowed = (ws: string) => DEMO_WORKSPACES.includes(ws);

const askSchema = z.object({
  workspace,
  question: trim(500),
  cid: cid.optional(),
  channel: z.enum(['web', 'staff']).default('web'),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: trim(600) })).max(6).default([]),
});

/** One customer question in, one answer out. Never throws: failures come back as an `error` answer. */
export async function askAssistantAction(input: z.input<typeof askSchema>): Promise<Answer> {
  const p = askSchema.safeParse(input);
  if (!p.success || !isWorkspaceId(p.data.workspace)) return { kind: 'error', text: 'Something went wrong. Please try again.', sources: [] };
  try {
    const { ip } = await clientInfo();
    return await answerQuestion(p.data.workspace, p.data.question, ip, p.data.history, p.data.cid, p.data.channel === 'staff' && (staffAllowed(p.data.workspace) || (await getStaff())?.workspace === p.data.workspace) ? 'staff' : 'web');
  } catch (e) {
    console.error('[assistant] could not answer:', (e as Error).message);
    return { kind: 'error', text: "I couldn't reach my notes just now. Please try again in a moment.", sources: [] };
  }
}

const feedbackSchema = z.object({
  workspace,
  cid: cid.optional(),
  mid: z.string().regex(/^[a-f0-9-]{36}$/).optional(),
  helpful: z.boolean(),
  reason: trim(60).default(''),
  question: trim(500).default(''),
  answer: trim(1500).default(''),
  sources: z.array(trim(120)).max(8).default([]),
});

export async function assistantFeedbackAction(input: z.input<typeof feedbackSchema>): Promise<Result> {
  const p = feedbackSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Something went wrong.' };
  const { ip } = await clientInfo();
  if (!(await rateLimit(`feedback:${ip}`, 30, 10 * 60000))) return { ok: false, error: 'Too many requests.' };
  await connectDB();
  const { cid: c, mid, ...d } = p.data;
  await AssistantFeedback.create({ ...d, question: redact(d.question), answer: redact(d.answer) });
  if (c && mid) {
    // Show the rating on the saved chat, and flag it for the owner when it was not helpful.
    await Conversation.updateOne(
      { workspace: d.workspace, cid: c, 'messages.mid': mid },
      { $set: { 'messages.$.rating': d.helpful ? 'up' : 'down', 'messages.$.reason': d.reason, ...(d.helpful ? {} : { 'flags.notHelpful': true }) } },
    );
  }
  return { ok: true };
}

const handoverSchema = z.object({
  workspace,
  name: trim(120).min(1, 'Please tell us your name.'),
  contact: trim(200).min(3, 'Add an email address or phone number.'),
  suburb: trim(120).default(''),
  question: trim(1000).default(''),
  cid: cid.optional(),
  consent: z.literal(true, { message: 'Please agree so the team can contact you.' }),
  trap: z.string().max(200).optional(),
});

export async function assistantHandoverAction(input: z.input<typeof handoverSchema>): Promise<Result> {
  const p = handoverSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Please check the form.' };
  if (p.data.trap) return { ok: true };
  const { ip } = await clientInfo();
  if (!(await rateLimit(`handover:${ip}`, 5, 60 * 60000))) return { ok: false, error: 'Too many requests from this connection. Please try again later.' };
  await connectDB();
  const d = p.data;
  // The owner reads hand-overs in Messages like any other enquiry. A phone-only contact has no email, so it gets a clearly fake one.
  const hasEmail = d.contact.includes('@');
  await Message.create({
    name: d.name, email: hasEmail ? d.contact : 'phone-only@handover.invalid', phone: hasEmail ? '' : d.contact, needs: ['Assistant handover'],
    message: `${d.question || 'No question was added.'}${d.suburb ? `
Suburb: ${d.suburb}` : ''}

(From the ${WORKSPACES[d.workspace as 'khumalo'].business} assistant.)`,
  });
  await Handover.create({ workspace: d.workspace, name: d.name, contact: d.contact, suburb: d.suburb, question: d.question });
  if (d.cid) {
    const convo = await Conversation.findOneAndUpdate({ workspace: d.workspace, cid: d.cid }, { $set: { 'flags.handedOver': true } }, { new: true }).lean();
    // Count this hand-over against the last question the assistant couldn't answer in this chat.
    const msgs = convo?.messages ?? [];
    const at = msgs.map((m: { kind?: string | null }) => m.kind).lastIndexOf('unknown');
    const asked = at > 0 ? msgs[at - 1]?.text : '';
    if (asked) await Unanswered.updateOne({ workspace: d.workspace, $or: [{ question: asked }, { askedAs: asked }] }, { $inc: { handovers: 1 } });
  }
  // The demo business is fictional, so its hand-overs go to the byteleaf owner. Real clients will get their own contact.
  const settings = toSettings((await getSettingsDoc()).toObject(), { name: '', email: '', twoStep: false });
  const owner = (await getAssistantSettings('khumalo')).talk.sendTo || settings.business.notifyEmail || settings.business.publicEmail;
  if (owner && isWorkspaceId(d.workspace)) {
    await mail.assistantHandoverOwner(owner, { business: WORKSPACES[d.workspace].business, name: d.name, contact: d.contact, question: d.question });
  }
  return { ok: true };
}
