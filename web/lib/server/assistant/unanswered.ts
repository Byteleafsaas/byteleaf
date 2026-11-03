import 'server-only';
import type { WorkspaceId } from '@/lib/assistant/workspaces';
import { connectDB } from '../db';
import { Unanswered } from '../models';

export type UnansweredRow = {
  id: string;
  question: string;
  count: number;
  handovers: number;
  alsoAsked: string[];
  lastAskedAt: string;
  status: 'open' | 'done' | 'ignored';
};

export type UnansweredData = {
  rows: UnansweredRow[];
  tabs: { open: number; done: number; ignored: number };
  stats: { needAnswer: number; customers: number; handovers: number };
  /** Handovers that answering the two most-asked questions would have avoided. */
  topTwoHandovers: number;
};

export async function loadUnanswered(workspace: WorkspaceId): Promise<UnansweredData> {
  await connectDB();
  const docs = await Unanswered.find({ workspace }).sort({ count: -1, lastAskedAt: -1 }).lean();
  const rows: UnansweredRow[] = docs.map((d) => ({
    id: String(d._id), question: d.question, count: d.count, handovers: d.handovers ?? 0,
    alsoAsked: (d.askedAs ?? []).filter((a: string) => a !== d.question).slice(0, 4), lastAskedAt: (d.lastAskedAt ?? new Date()).toISOString(), status: d.status as UnansweredRow['status'],
  }));
  const open = rows.filter((r) => r.status === 'open');
  return {
    rows,
    tabs: { open: open.length, done: rows.filter((r) => r.status === 'done').length, ignored: rows.filter((r) => r.status === 'ignored').length },
    stats: { needAnswer: open.length, customers: open.reduce((n, r) => n + r.count, 0), handovers: open.reduce((n, r) => n + r.handovers, 0) },
    topTwoHandovers: open.slice(0, 2).reduce((n, r) => n + r.handovers, 0),
  };
}
