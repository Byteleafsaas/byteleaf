'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { WorkspaceId } from '@/lib/assistant/workspaces';
import { loadReviewItems, type ReviewItem } from '../assistant/review';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { KnowledgeItem } from '../models';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const WS: WorkspaceId = 'khumalo';

const refresh = () => revalidatePath('/admin/assistant', 'layout');

export async function listReviewItemsAction(): Promise<Result<{ items: ReviewItem[] }>> {
  await assertAdmin();
  return { ok: true, items: await loadReviewItems(WS) };
}

const approveSchema = z.object({ id: objectId, text: z.string().trim().min(5, 'The answer can’t be empty.').max(900).optional() });

/** Approves an item, optionally with the owner's own wording. An edited item is no longer shown as AI cleaned. */
export async function approveItemAction(input: z.input<typeof approveSchema>): Promise<Result<{ items: ReviewItem[] }>> {
  await assertAdmin();
  const p = approveSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the answer and try again.' };
  await connectDB();
  const item = await KnowledgeItem.findOne({ _id: p.data.id, workspace: WS });
  if (!item) return { ok: false, error: 'Item not found.' };
  if (item.conflictWith) return { ok: false, error: 'Choose which price is right first.' };
  const edited = p.data.text !== undefined && p.data.text !== item.text;
  await KnowledgeItem.updateOne({ _id: item._id }, { $set: { status: 'approved', ...(edited ? { text: p.data.text, edited: true, aiCleaned: false, unsure: '', unsurePhrase: '' } : {}) } });
  refresh();
  return { ok: true, items: await loadReviewItems(WS) };
}

export async function rejectItemAction(id: string): Promise<Result<{ items: ReviewItem[] }>> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'Item not found.' };
  await connectDB();
  await KnowledgeItem.updateOne({ _id: id, workspace: WS }, { $set: { status: 'rejected', conflictWith: null } });
  refresh();
  return { ok: true, items: await loadReviewItems(WS) };
}

/** Puts an approved or rejected item back to "needs review". */
export async function reopenItemAction(id: string): Promise<Result<{ items: ReviewItem[] }>> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'Item not found.' };
  await connectDB();
  await KnowledgeItem.updateOne({ _id: id, workspace: WS }, { $set: { status: 'pending' } });
  refresh();
  return { ok: true, items: await loadReviewItems(WS) };
}

/** Two items disagree. `keep` says which one is right; the other is marked outdated and won't be used again. */
export async function resolveConflictAction(id: string, keep: 'mine' | 'other'): Promise<Result<{ items: ReviewItem[] }>> {
  await assertAdmin();
  if (!objectId.safeParse(id).success || (keep !== 'mine' && keep !== 'other')) return { ok: false, error: 'Item not found.' };
  await connectDB();
  const item = await KnowledgeItem.findOne({ _id: id, workspace: WS });
  if (!item?.conflictWith) return { ok: false, error: 'There is nothing to resolve here.' };
  const otherId = item.conflictWith;
  if (keep === 'mine') {
    await KnowledgeItem.updateOne({ _id: item._id }, { $set: { status: 'approved', conflictWith: null } });
    await KnowledgeItem.updateOne({ _id: otherId }, { $set: { status: 'rejected', conflictWith: null } });
  } else {
    await KnowledgeItem.updateOne({ _id: item._id }, { $set: { status: 'rejected', conflictWith: null } });
  }
  refresh();
  return { ok: true, items: await loadReviewItems(WS) };
}

/** Makes every approved item live and discards the rejected ones. Items still waiting stay hidden from customers. */
export async function publishAction(): Promise<Result<{ published: number; discarded: number; waiting: number }>> {
  await assertAdmin();
  await connectDB();
  const [live, gone, waiting] = await Promise.all([
    KnowledgeItem.updateMany({ workspace: WS, status: 'approved' }, { $set: { status: 'live', conflictWith: null } }),
    KnowledgeItem.deleteMany({ workspace: WS, status: 'rejected' }),
    KnowledgeItem.countDocuments({ workspace: WS, status: 'pending' }),
  ]);
  refresh();
  revalidatePath('/projects/knowledge-chatbot');
  return { ok: true, published: live.modifiedCount, discarded: gone.deletedCount, waiting };
}

