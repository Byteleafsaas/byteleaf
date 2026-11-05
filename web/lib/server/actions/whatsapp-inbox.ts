'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertAdmin } from '../auth';
import { handBack, reply, sendTemplate, takeOver } from '../whatsapp/inbox';

type Result = { ok: true; sent: boolean } | { ok: false; error: string };
const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const refresh = () => revalidatePath('/admin/bookings', 'layout');
const bad: Result = { ok: false, error: 'That chat no longer exists.' };

/** The owner takes over a chat: the assistant goes quiet. */
export async function takeOverAction(chatId: string): Promise<Result> {
  const admin = await assertAdmin();
  if (!objectId.safeParse(chatId).success) return bad;
  const r = await takeOver(chatId, admin.name);
  refresh();
  return r;
}

/** The owner's own message to the client. */
export async function replyAction(chatId: string, text: string): Promise<Result> {
  const admin = await assertAdmin();
  if (!objectId.safeParse(chatId).success) return bad;
  const r = await reply(chatId, admin.name, text);
  refresh();
  return r;
}

/** The owner hands the chat back to the assistant. */
export async function handBackAction(chatId: string): Promise<Result> {
  const admin = await assertAdmin();
  if (!objectId.safeParse(chatId).success) return bad;
  const r = await handBack(chatId, admin.name);
  refresh();
  return r;
}

/** With the window closed, an approved template is the only thing that can be sent. */
export async function sendTemplateAction(chatId: string, templateId: string): Promise<Result> {
  const admin = await assertAdmin();
  if (!objectId.safeParse(chatId).success) return bad;
  const r = await sendTemplate(chatId, templateId, admin.name);
  refresh();
  return r;
}
