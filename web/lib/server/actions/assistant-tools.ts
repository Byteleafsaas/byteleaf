'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { onBrand } from '@/lib/assistant/contrast';
import { redact } from '@/lib/assistant/redact';
import { settingsSchema, type AssistantSettings } from '@/lib/assistant/settings';
import type { WorkspaceId } from '@/lib/assistant/workspaces';
import { testAnswer, type TestResult } from '../assistant/engine';
import { getAssistantSettings } from '../assistant/settings';
import { loadUnanswered, type UnansweredData } from '../assistant/unanswered';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { AssistantSettingsModel, KnowledgeItem, KnowledgeSource, Unanswered } from '../models';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const WS: WorkspaceId = 'khumalo';
const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const refresh = () => revalidatePath('/admin/assistant', 'layout');

/* ---------- test assistant ---------- */

const testSchema = z.object({
  question: z.string().trim().min(1).max(500),
  draft: z.boolean().default(false),
  staff: z.boolean().default(false),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(600) })).max(6).default([]),
});

export async function testAssistantAction(input: z.input<typeof testSchema>): Promise<Result<{ result: TestResult }>> {
  await assertAdmin();
  const p = testSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Type a question to test.' };
  try {
    return { ok: true, result: await testAnswer(WS, p.data.question, p.data.history, { draft: p.data.draft, staff: p.data.staff }) };
  } catch (e) {
    console.error('[assistant] test failed:', (e as Error).message);
    return { ok: false, error: 'The test didn’t run. Please try again.' };
  }
}

/* ---------- unanswered ---------- */

export async function listUnansweredAction(): Promise<Result<{ data: UnansweredData }>> {
  await assertAdmin();
  return { ok: true, data: await loadUnanswered(WS) };
}

const answerSchema = z.object({
  id: objectId,
  text: z.string().trim().min(10, 'Write a little more so the answer is useful.').max(600, 'Keep the answer under 600 characters.'),
  staffOnly: z.boolean().default(false),
});

/** The owner's own words go live as written: they skip AI cleaning and review. */
export async function addAnswerAction(input: z.input<typeof answerSchema>): Promise<Result<{ data: UnansweredData }>> {
  const admin = await assertAdmin();
  const p = answerSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the answer and try again.' };
  await connectDB();
  const q = await Unanswered.findOne({ _id: p.data.id, workspace: WS });
  if (!q) return { ok: false, error: 'Question not found.' };

  const source = await KnowledgeSource.findOneAndUpdate(
    { workspace: WS, name: 'Typed answers' },
    { $setOnInsert: { type: 'typed', detail: admin.name, state: 'ready', createdBy: admin.name } },
    { upsert: true, new: true },
  );
  let title = q.question.replace(/[?\s]+$/, '').slice(0, 110);
  for (let n = 2; await KnowledgeItem.exists({ workspace: WS, title }); n++) title = `${q.question.replace(/[?\s]+$/, '').slice(0, 100)} (${n})`;
  const item = await KnowledgeItem.create({
    workspace: WS, sourceId: source._id, sourceName: 'Typed answers', sourceType: 'typed', title, text: p.data.text, status: 'live', staffOnly: p.data.staffOnly, aiCleaned: false,
    asks: q.question, where: 'typed', order: await KnowledgeItem.countDocuments({ workspace: WS }),
  });
  await Unanswered.updateOne({ _id: q._id }, { $set: { status: 'done', answeredAt: new Date(), itemId: item._id } });
  await KnowledgeSource.updateOne({ _id: source._id }, { $set: { updatedAt: new Date() } });
  refresh();
  return { ok: true, data: await loadUnanswered(WS) };
}

export async function setUnansweredStatusAction(id: string, status: 'open' | 'ignored'): Promise<Result<{ data: UnansweredData }>> {
  await assertAdmin();
  if (!objectId.safeParse(id).success || (status !== 'open' && status !== 'ignored')) return { ok: false, error: 'Question not found.' };
  await connectDB();
  await Unanswered.updateOne({ _id: id, workspace: WS }, { $set: { status } });
  refresh();
  return { ok: true, data: await loadUnanswered(WS) };
}

/** Runs the live assistant on a question, so the owner can check a new answer works. */
export async function askAgainAction(question: string): Promise<Result<{ result: TestResult }>> {
  await assertAdmin();
  if (!question || question.length > 500) return { ok: false, error: 'Question not found.' };
  return { ok: true, result: await testAnswer(WS, redact(question), [], { draft: false, staff: false }) };
}

/* ---------- settings ---------- */

export async function saveSettingsAction(input: AssistantSettings): Promise<Result<{ settings: AssistantSettings }>> {
  await assertAdmin();
  const p = settingsSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the form and try again.' };
  const contrast = onBrand(p.data.brand);
  if (!contrast.passes) return { ok: false, error: 'That colour is too close to both white and dark text to read. Choose a stronger or paler colour.' };
  const d = p.data;
  await connectDB();
  // Keep the list tidy: no repeats, in the order the owner added them.
  const refused = [...new Map(d.refused.map((t) => [t.toLowerCase(), t])).values()];
  await AssistantSettingsModel.updateOne({ workspace: WS }, { $set: { ...d, refused, brand: d.brand.toUpperCase() } }, { upsert: true });
  refresh();
  revalidatePath('/projects/knowledge-chatbot');
  return { ok: true, settings: await getAssistantSettings(WS) };
}
