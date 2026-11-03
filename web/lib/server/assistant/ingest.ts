import 'server-only';
import { htmlToText, pageTitle, sameSiteLinks } from '@/lib/assistant/html';
import { conflicts } from '@/lib/assistant/conflict';
import { splitIntoItems, type RawItem } from '@/lib/assistant/split';
import { WORKSPACES, type WorkspaceId } from '@/lib/assistant/workspaces';
import { connectDB } from '../db';
import { KnowledgeItem, KnowledgeSource } from '../models';
import { extractFile } from './extract';
import { cleanText, llmEnabled } from './llm';
import { SourceProblem, fetchHtml } from './safe-fetch';

export type IngestInput =
  | { kind: 'web'; url: URL; follow: boolean }
  | { kind: 'text'; text: string }
  | { kind: 'file'; buffer: Buffer; filename: string; mime: string };

export const MAX_LINKED_PAGES = 30;
const CHUNK_CHARS = 6000;

async function progress(id: string, p: { stage: string; done?: number; total?: number }) {
  await KnowledgeSource.updateOne(
    { _id: id },
    { $set: { 'progress.stage': p.stage, ...(p.done !== undefined ? { 'progress.done': p.done } : {}), ...(p.total !== undefined ? { 'progress.total': p.total } : {}) } },
  );
}

/** Cuts text into pieces the model can handle, on paragraph boundaries. */
export function chunkText(text: string, size = CHUNK_CHARS): string[] {
  const out: string[] = [];
  let cur = '';
  for (const para of text.split(/\n{2,}/)) {
    if (cur && cur.length + para.length > size) {
      out.push(cur);
      cur = '';
    }
    cur = cur ? `${cur}\n\n${para}` : para;
    while (cur.length > size * 1.5) {
      out.push(cur.slice(0, size));
      cur = cur.slice(size);
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

async function readWeb(id: string, input: Extract<IngestInput, { kind: 'web' }>): Promise<{ text: string; pages: number }> {
  await progress(id, { stage: 'fetch' });
  const first = await fetchHtml(input.url);
  const parts = [`${pageTitle(first.html)}\n${htmlToText(first.html)}`];
  let pages = 1;
  if (input.follow) {
    const links = sameSiteLinks(first.html, first.url).slice(0, MAX_LINKED_PAGES - 1);
    await progress(id, { stage: 'fetch', done: 1, total: links.length + 1 });
    for (const [i, link] of links.entries()) {
      try {
        const page = await fetchHtml(new URL(link));
        parts.push(`${pageTitle(page.html)}\n${htmlToText(page.html)}`);
        pages++;
      } catch {
        // one unreadable page shouldn't stop the rest
      }
      await progress(id, { stage: 'fetch', done: i + 2 });
    }
  }
  return { text: parts.join('\n\n'), pages };
}

/** Reads a source, tidies it into items and leaves them waiting for the owner's approval. Never throws. */
export async function ingest(sourceId: string, workspace: WorkspaceId, input: IngestInput) {
  try {
    await connectDB();
    let text: string;
    let pages = 1;
    if (input.kind === 'web') ({ text, pages } = await readWeb(sourceId, input));
    else if (input.kind === 'file') {
      await progress(sourceId, { stage: 'read' });
      const out = await extractFile(input.buffer, input.filename, input.mime);
      text = out.text;
      pages = out.pages;
      await KnowledgeSource.updateOne({ _id: sourceId }, { $set: { fileKind: out.kind, pages } });
    } else text = input.text;

    const source = await KnowledgeSource.findById(sourceId).lean();
    if (!source) return;
    const business = WORKSPACES[workspace].business;

    const pieces = chunkText(text);
    const estimate = Math.max(1, splitIntoItems(text).length);
    await progress(sourceId, { stage: 'clean', done: 0, total: estimate });

    const items: (RawItem & { ai: boolean; original: string })[] = [];
    const seen = new Set<string>();
    for (const [i, piece] of pieces.entries()) {
      const viaModel = llmEnabled() ? await cleanText(business, source.name, piece) : null;
      const got: (RawItem & { ai: boolean })[] = viaModel ? viaModel.map((x) => ({ ...x, ai: true })) : splitIntoItems(piece).map((x) => ({ ...x, ai: false }));
      for (const it of got) {
        const key = it.text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({ ...it, original: piece.slice(0, 1200) });
      }
      await progress(sourceId, { stage: 'clean', done: Math.min(estimate, Math.round(((i + 1) / pieces.length) * estimate)) });
    }

    if (!items.length) {
      const problem =
        input.kind === 'web'
          ? `We read ${pages} page${pages === 1 ? '' : 's'} but found no prices, services or policies. Try your services page instead, or add the information as text.`
          : 'We couldn’t find anything useful in that. Add the information as text instead.';
      await KnowledgeSource.updateOne({ _id: sourceId }, { $set: { state: 'nothing', pages, problem } });
      return;
    }

    const base = await KnowledgeItem.countDocuments({ workspace });
    // Items from other sources that this source's items might disagree with (live, approved or still waiting).
    const others = await KnowledgeItem.find({ workspace, sourceId: { $ne: source._id }, status: { $in: ['live', 'approved', 'pending'] } }, { title: 1, text: 1 }).lean();
    const where = source.type === 'web' ? 'web page' : source.type === 'typed' ? 'typed' : 'file';
    await KnowledgeItem.insertMany(
      items.map((it, i) => ({
        workspace, sourceId: source._id, sourceName: source.name, sourceType: source.type, title: it.title.slice(0, 120), text: it.text, original: it.original,
        status: 'pending', staffOnly: source.staffOnly, aiCleaned: it.ai, unsure: it.unsure ?? '', unsurePhrase: it.unsurePhrase ?? '', asks: it.asks ?? '', where,
        conflictWith: others.find((o) => conflicts(it, o))?._id ?? null, order: base + i,
      })),
    );
    await KnowledgeSource.updateOne({ _id: sourceId }, { $set: { state: 'ready', pages, problem: '', 'progress.stage': 'ready', 'progress.done': items.length, 'progress.total': items.length } });
  } catch (e) {
    const problem = e instanceof SourceProblem ? e.message : 'Something went wrong while reading this. Please try again.';
    if (!(e instanceof SourceProblem)) console.error('[assistant] ingest failed:', (e as Error).message);
    await KnowledgeSource.updateOne({ _id: sourceId }, { $set: { state: 'failed', problem } }).catch(() => {});
  }
}
