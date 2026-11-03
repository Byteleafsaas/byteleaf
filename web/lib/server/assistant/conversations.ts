import 'server-only';
import type { WorkspaceId } from '@/lib/assistant/workspaces';
import { connectDB } from '../db';
import { Conversation } from '../models';

export type Outcome = 'answered' | 'unknown' | 'notHelpful' | 'handedOver' | 'refused' | 'helpful';

export type ConvoMessage = { role: 'user' | 'assistant'; text: string; at: string; kind: string; sources: string[]; rating: '' | 'up' | 'down'; reason: string };
export type ConvoRow = {
  id: string;
  firstQuestion: string;
  visitor: string;
  channel: 'web' | 'staff';
  startedAt: string;
  lastAt: string;
  expiresAt: string;
  outcomes: Outcome[];
  messageCount: number;
  sourcesUsed: number;
  messages: ConvoMessage[];
};

export type ConversationsData = {
  rows: ConvoRow[];
  stats: { total: number; answeredPct: number; helpfulPct: number; handedOver: number };
  days: number;
};

const outcomesOf = (c: { flags?: { unknown?: boolean; notHelpful?: boolean; handedOver?: boolean; refused?: boolean } | null; messages: { rating?: string | null; kind?: string | null; role: string }[] }): Outcome[] => {
  const f = c.flags ?? {};
  const out: Outcome[] = [];
  if (f.unknown) out.push('unknown');
  if (f.refused) out.push('refused');
  if (f.notHelpful) out.push('notHelpful');
  if (f.handedOver) out.push('handedOver');
  if (!out.length) out.push(c.messages.some((m) => m.rating === 'up') ? 'helpful' : 'answered');
  return out;
};

/** The saved chats from the last `days` days, newest first, with the numbers for the tiles at the top. */
export async function loadConversations(workspace: WorkspaceId, days = 7): Promise<ConversationsData> {
  await connectDB();
  const since = new Date(Date.now() - days * 86400000);
  const docs = await Conversation.find({ workspace, lastAt: { $gte: since } }).sort({ lastAt: -1 }).limit(300).lean();

  let answers = 0, unknowns = 0, up = 0, down = 0;
  const rows: ConvoRow[] = docs.map((c) => {
    for (const m of c.messages) {
      if (m.role === 'assistant' && m.kind === 'answer') answers++;
      if (m.role === 'assistant' && m.kind === 'unknown') unknowns++;
      if (m.rating === 'up') up++;
      if (m.rating === 'down') down++;
    }
    return {
      id: String(c._id), firstQuestion: c.firstQuestion || c.messages[0]?.text || '', visitor: c.visitor, channel: c.channel as 'web' | 'staff',
      startedAt: c.startedAt.toISOString(), lastAt: c.lastAt.toISOString(), expiresAt: c.expiresAt.toISOString(), outcomes: outcomesOf(c), messageCount: c.messages.length,
      sourcesUsed: new Set(c.messages.flatMap((m: { sources?: string[] }) => m.sources ?? [])).size,
      messages: c.messages.map((m: { role: string; text?: string | null; at?: Date | null; kind?: string | null; sources?: string[]; rating?: string | null; reason?: string | null }) => ({ role: m.role as 'user' | 'assistant', text: m.text ?? '', at: (m.at ?? c.startedAt).toISOString(), kind: m.kind ?? '', sources: m.sources ?? [], rating: (m.rating ?? '') as ConvoMessage['rating'], reason: m.reason ?? '' })),
    };
  });
  return {
    rows,
    days,
    stats: {
      total: rows.length,
      answeredPct: answers + unknowns ? Math.round((answers / (answers + unknowns)) * 100) : 0,
      helpfulPct: up + down ? Math.round((up / (up + down)) * 100) : 0,
      handedOver: rows.filter((r) => r.outcomes.includes('handedOver')).length,
    },
  };
}
