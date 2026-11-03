import 'server-only';
import { connectDB } from '../db';
import { KnowledgeItem, KnowledgeSource, Unanswered } from '../models';
import type { WorkspaceId } from '@/lib/assistant/workspaces';

export type SourceStatus = 'live' | 'review' | 'partly' | 'processing' | 'failed' | 'nothing';

export type SourceRow = {
  id: string;
  name: string;
  type: 'web' | 'file' | 'typed';
  typeLabel: string;
  staffOnly: boolean;
  status: SourceStatus;
  partly: string;
  items: number;
  pct: number;
  stage: string;
  problem: string;
  updatedAt: string;
};

const hostPath = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export async function loadSources(workspace: WorkspaceId): Promise<SourceRow[]> {
  await connectDB();
  const [sources, groups] = await Promise.all([
    KnowledgeSource.find({ workspace }).sort({ updatedAt: -1 }).lean(),
    KnowledgeItem.aggregate<{ _id: { s: unknown; st: string }; n: number }>([
      { $match: { workspace } },
      { $group: { _id: { s: '$sourceId', st: '$status' }, n: { $sum: 1 } } },
    ]),
  ]);
  const by = new Map<string, Record<string, number>>();
  for (const g of groups) {
    const k = String(g._id.s);
    by.set(k, { ...(by.get(k) ?? {}), [g._id.st]: g.n });
  }

  return sources.map((s) => {
    const c = by.get(String(s._id)) ?? {};
    const live = c.live ?? 0, approved = c.approved ?? 0, pending = c.pending ?? 0;
    const total = live + approved + pending;
    let status: SourceStatus;
    if (s.state === 'processing') status = 'processing';
    else if (s.state === 'failed') status = 'failed';
    else if (s.state === 'nothing') status = 'nothing';
    else if (!pending) status = 'live';
    else status = live + approved > 0 ? 'partly' : 'review';

    const pct = s.progress?.total ? Math.min(100, Math.round(((s.progress.done ?? 0) / s.progress.total) * 100)) : 0;
    const base =
      s.type === 'web' ? `Web page · ${hostPath(s.detail)}` : s.type === 'file' ? `File · ${s.fileKind || 'Document'}${s.pages ? ` · ${s.pages} page${s.pages === 1 ? '' : 's'}` : ''}` : `Typed by ${s.createdBy || 'the owner'}`;
    const stage = s.progress?.stage ?? '';
    const typeLabel = status === 'processing' && stage === 'clean' && s.progress?.total ? `${base} · cleaning ${s.progress.done ?? 0} of ${s.progress.total} items` : base;

    return {
      id: String(s._id), name: s.name, type: s.type, typeLabel, staffOnly: s.staffOnly, status,
      partly: status === 'partly' ? `${live + approved} of ${total} approved` : '',
      items: total, pct, stage, problem: s.problem ?? '', updatedAt: (s.updatedAt ?? new Date()).toISOString(),
    };
  });
}

/** Numbers for the sidebar badges. */
export async function loadAssistantCounts(workspace: WorkspaceId) {
  await connectDB();
  const [review, unanswered] = await Promise.all([
    KnowledgeItem.countDocuments({ workspace, status: 'pending' }),
    Unanswered.countDocuments({ workspace, status: 'open' }),
  ]);
  return { review, unanswered };
}
