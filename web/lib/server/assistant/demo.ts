import 'server-only';
import type { WorkspaceId } from '@/lib/assistant/workspaces';
import { connectDB } from '../db';
import { KnowledgeItem, KnowledgeSource } from '../models';

export type KnownSource = { name: string; label: string; items: number; staffOnly: boolean; type: 'web' | 'file' | 'typed' };

/** The published sources shown in "What this assistant knows". Only sources with live items count. */
export async function loadKnownSources(workspace: WorkspaceId): Promise<{ sources: KnownSource[]; updated: string }> {
  await connectDB();
  const [groups, sources] = await Promise.all([
    KnowledgeItem.aggregate<{ _id: string; n: number; last: Date }>([{ $match: { workspace, status: 'live' } }, { $group: { _id: '$sourceName', n: { $sum: 1 }, last: { $max: '$updatedAt' } } }]),
    KnowledgeSource.find({ workspace, state: 'ready' }).lean(),
  ]);
  const byName = new Map(sources.map((s) => [s.name, s]));
  const rows: KnownSource[] = groups
    .map((g) => {
      const s = byName.get(g._id);
      const host = s?.type === 'web' ? s.detail.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
      const label = !s ? 'Typed' : s.type === 'web' ? `Web page · ${host}` : s.type === 'file' ? `${s.fileKind || 'File'}${s.pages ? ` · ${s.pages} page${s.pages === 1 ? '' : 's'}` : ''} · ${g.n} items` : `Typed by ${s.createdBy || 'the owner'} · ${g.n} items`;
      return { name: g._id, label, items: g.n, staffOnly: s?.staffOnly ?? false, type: (s?.type ?? 'typed') as KnownSource['type'] };
    })
    .sort((a, b) => Number(a.staffOnly) - Number(b.staffOnly) || b.items - a.items);
  const last = groups.reduce((d, g) => (g.last > d ? g.last : d), new Date(0));
  return { sources: rows, updated: last.getTime() ? last.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Johannesburg' }) : '' };
}
