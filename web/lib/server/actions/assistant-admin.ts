'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isWorkspaceId, type WorkspaceId } from '@/lib/assistant/workspaces';
import { loadSources, type SourceRow } from '../assistant/admin';
import { ingest } from '../assistant/ingest';
import { SourceProblem, fetchHtml, parseWebAddress } from '../assistant/safe-fetch';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { KnowledgeItem, KnowledgeSource } from '../models';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const workspace = z.string().refine(isWorkspaceId, 'Unknown assistant.');
const objectId = z.string().regex(/^[a-f0-9]{24}$/);

const refresh = () => revalidatePath('/admin/assistant', 'layout');

const webSchema = z.object({ workspace, url: z.string().trim().min(1, 'Enter a web address.').max(500), follow: z.boolean().default(false), staffOnly: z.boolean().default(false) });

/** Starts reading a web page. The reading carries on in the background; poll with getSourceProgressAction. */
export async function startWebSourceAction(input: z.input<typeof webSchema>): Promise<Result<{ id: string }>> {
  const admin = await assertAdmin();
  const p = webSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the address and try again.' };
  const ws = p.data.workspace as WorkspaceId;
  let url: URL;
  try {
    url = parseWebAddress(p.data.url);
    await fetchHtml(url); // fail fast with a plain-English reason before a source is created
  } catch (e) {
    return { ok: false, error: e instanceof SourceProblem ? e.message : 'We couldn’t reach that address.' };
  }
  await connectDB();
  const src = await KnowledgeSource.create({
    workspace: ws, name: url.pathname === '/' ? url.hostname.replace(/^www\./, '') : `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`,
    type: 'web', detail: url.toString(), state: 'processing', progress: { stage: 'fetch', done: 0, total: 0 }, staffOnly: p.data.staffOnly, createdBy: admin.name,
  });
  void ingest(String(src._id), ws, { kind: 'web', url, follow: p.data.follow });
  refresh();
  return { ok: true, id: String(src._id) };
}

const textSchema = z.object({
  workspace,
  name: z.string().trim().min(1, 'Give this a name so you can find it later.').max(120),
  text: z.string().trim().min(20, 'Add a little more text. The assistant needs something to read.').max(60000),
  staffOnly: z.boolean().default(false),
});

export async function startTextSourceAction(input: z.input<typeof textSchema>): Promise<Result<{ id: string }>> {
  const admin = await assertAdmin();
  const p = textSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the form and try again.' };
  await connectDB();
  const ws = p.data.workspace as WorkspaceId;
  const src = await KnowledgeSource.create({ workspace: ws, name: p.data.name, type: 'typed', detail: admin.name, state: 'processing', progress: { stage: 'clean', done: 0, total: 0 }, staffOnly: p.data.staffOnly, createdBy: admin.name });
  void ingest(String(src._id), ws, { kind: 'text', text: p.data.text });
  refresh();
  return { ok: true, id: String(src._id) };
}

/** Where the Add a source screen asks how its sources are getting on. */
export async function getSourceProgressAction(ids: string[]): Promise<Result<{ rows: SourceRow[] }>> {
  await assertAdmin();
  const wanted = z.array(objectId).max(20).safeParse(ids);
  if (!wanted.success) return { ok: false, error: 'Unknown source.' };
  const rows = (await loadSources('khumalo')).filter((r) => wanted.data.includes(r.id));
  return { ok: true, rows };
}

export async function listSourcesAction(ws: string): Promise<Result<{ rows: SourceRow[] }>> {
  await assertAdmin();
  if (!isWorkspaceId(ws)) return { ok: false, error: 'Unknown assistant.' };
  return { ok: true, rows: await loadSources(ws) };
}

export async function deleteSourceAction(id: string): Promise<Result> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'Source not found.' };
  await connectDB();
  await Promise.all([KnowledgeItem.deleteMany({ sourceId: id }), KnowledgeSource.deleteOne({ _id: id })]);
  refresh();
  return { ok: true };
}

export async function setSourceStaffOnlyAction(id: string, staffOnly: boolean): Promise<Result> {
  await assertAdmin();
  if (!objectId.safeParse(id).success) return { ok: false, error: 'Source not found.' };
  await connectDB();
  await Promise.all([KnowledgeSource.updateOne({ _id: id }, { $set: { staffOnly } }), KnowledgeItem.updateMany({ sourceId: id }, { $set: { staffOnly } })]);
  refresh();
  return { ok: true };
}

