'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { Message } from '../models';

const schema = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/), read: z.boolean().optional(), archived: z.boolean().optional() });

export async function updateMessageAction(input: z.input<typeof schema>): Promise<{ ok: boolean }> {
  await assertAdmin();
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false };
  await connectDB();
  const set: Record<string, boolean> = {};
  if (p.data.read !== undefined) set.read = p.data.read;
  if (p.data.archived !== undefined) set.archived = p.data.archived;
  await Message.updateOne({ _id: p.data.id }, { $set: set });
  revalidatePath('/admin', 'layout');
  return { ok: true };
}
