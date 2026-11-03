import 'server-only';
import { amounts } from '@/lib/assistant/conflict';
import type { WorkspaceId } from '@/lib/assistant/workspaces';
import { connectDB } from '../db';
import { KnowledgeItem, KnowledgeSource } from '../models';

export type ChoiceSide = { id: string; source: string; where: string; price: string; quote: string; when: string; sourceType: 'web' | 'file' | 'typed' };

export type ReviewItem = {
  id: string;
  source: string;
  sourceType: 'web' | 'file' | 'typed';
  where: string;
  title: string;
  text: string;
  original: string;
  asks: string;
  unsure: string;
  unsurePhrase: string;
  aiCleaned: boolean;
  edited: boolean;
  status: 'pending' | 'approved' | 'rejected';
  /** When this item disagrees with another one: both sides, so the owner can pick. */
  conflict: { mine: ChoiceSide; other: ChoiceSide } | null;
};

const rand = (n: number) => `R ${Math.round(n).toLocaleString('en-ZA').replace(/ |,/g, ' ')}`;

export async function loadReviewItems(workspace: WorkspaceId): Promise<ReviewItem[]> {
  await connectDB();
  const rows = await KnowledgeItem.find({ workspace, status: { $in: ['pending', 'approved', 'rejected'] } }).sort({ order: 1 }).lean();
  const otherIds = rows.map((r) => r.conflictWith).filter(Boolean);
  const others = otherIds.length ? await KnowledgeItem.find({ _id: { $in: otherIds } }).lean() : [];
  const sources = await KnowledgeSource.find({ workspace }, { name: 1, type: 1, updatedAt: 1 }).lean();
  const srcByName = new Map(sources.map((s) => [s.name, s]));
  const when = (name: string) => {
    const s = srcByName.get(name);
    const d = s?.updatedAt ? new Date(s.updatedAt) : null;
    if (!d) return '';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    const verb = s?.type === 'web' ? 'Read' : 'Uploaded';
    return days < 1 ? `${verb} today` : `${verb} ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Johannesburg' })}`;
  };
  const side = (r: (typeof rows)[number]): ChoiceSide => ({
    id: String(r._id), source: r.sourceName, where: r.where || '', price: amounts(r.text)[0] ? rand(amounts(r.text)[0]) : '', quote: r.original?.split('\n')[0] || r.text, when: when(r.sourceName),
    sourceType: r.sourceType,
  });

  return rows.map((r) => {
    const other = r.conflictWith ? others.find((o) => String(o._id) === String(r.conflictWith)) : null;
    return {
      id: String(r._id), source: r.sourceName, sourceType: r.sourceType, where: r.where || '', title: r.title, text: r.text, original: r.original || '', asks: r.asks || '',
      unsure: r.unsure || '', unsurePhrase: r.unsurePhrase || '', aiCleaned: r.aiCleaned, edited: r.edited, status: r.status as ReviewItem['status'],
      conflict: other ? { mine: side(r), other: side(other as (typeof rows)[number]) } : null,
    };
  });
}
