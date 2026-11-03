'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { loadConversations, type ConversationsData } from '../assistant/conversations';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { Conversation } from '../models';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function listConversationsAction(days: number): Promise<Result<{ data: ConversationsData }>> {
  await assertAdmin();
  const d = z.number().int().min(1).max(90).safeParse(days);
  if (!d.success) return { ok: false, error: 'Choose a date range.' };
  return { ok: true, data: await loadConversations('khumalo', d.data) };
}

export async function deleteConversationAction(id: string): Promise<Result> {
  await assertAdmin();
  if (!/^[a-f0-9]{24}$/.test(id)) return { ok: false, error: 'Conversation not found.' };
  await connectDB();
  await Conversation.deleteOne({ _id: id, workspace: 'khumalo' });
  revalidatePath('/admin/assistant', 'layout');
  return { ok: true };
}
