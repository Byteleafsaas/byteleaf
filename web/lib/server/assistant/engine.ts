import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { hasContactDetails, redact } from '@/lib/assistant/redact';
import { bestSentences, normaliseQuestion, rank, tokens } from '@/lib/assistant/retrieval';
import { refusedPattern } from '@/lib/assistant/settings';
import { WORKSPACES, type Answer, type AnswerSource, type WorkspaceId } from '@/lib/assistant/workspaces';
import { rateLimit } from '../auth';
import { connectDB } from '../db';
import { env } from '../env';
import { Conversation, KnowledgeItem, RateLimit, Unanswered } from '../models';
import { askModel, llmEnabled, type Turn } from './llm';
import { getAssistantSettings } from './settings';

const THANKS = /^(thanks|thank you|thx|cheers|great|perfect|awesome|ok|okay|cool|nice)\b/i;
const HELLO = /^(hi|hello|hey|howzit|good (morning|afternoon|evening))\b/i;

const COVERAGE_MIN = 0.55; // without a model: how much of the question a source must cover to be quoted
const MAX_SOURCES = 3;
const MODEL_SOURCES = 5; // with a model: how many passages it gets to read, even when the wording barely matches

const none = (kind: Answer['kind'], text: string, extra: Partial<Answer> = {}): Answer => ({ kind, text, sources: [], ...extra });
const wordCount = (s: string) => s.trim().split(/\s+/).length;

/** How a question is answered. `test` is the owner trying the assistant: no limits, nothing saved, nothing logged. */
export type AnswerOptions = { test?: boolean; draft?: boolean; staff?: boolean };

/** What the engine looked at, for the "Why it answered this" panel. */
type Trace = { coverage: number; disputed: boolean };

const sameQuestion = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
};

async function logUnanswered(workspace: WorkspaceId, rawQuestion: string) {
  const question = redact(rawQuestion);
  const ownKey = normaliseQuestion(question).slice(0, 160);
  if (!ownKey) return;
  // Group a question that is worded differently but means the same as one already waiting for an answer.
  const words = new Set(tokens(question));
  const open = await Unanswered.find({ workspace, status: 'open' }, { key: 1, question: 1 }).lean();
  const similar = open.find((o) => sameQuestion(words, new Set(tokens(o.question))) >= 0.6);
  const key = similar?.key ?? ownKey;
  await Unanswered.updateOne(
    { workspace, key },
    {
      $setOnInsert: { question: question.slice(0, 300), status: 'open' },
      $inc: { count: 1 },
      $set: { lastAskedAt: new Date() },
      ...(similar && similar.question !== question.slice(0, 300) ? { $addToSet: { askedAs: question.slice(0, 300) } } : {}),
    },
    { upsert: true },
  );
}

async function waitSeconds(key: string) {
  const doc = await RateLimit.findOne({ key }).lean();
  return Math.max(5, Math.ceil(((doc?.resetAt?.getTime() ?? Date.now() + 30000) - Date.now()) / 1000));
}

async function compute(workspace: WorkspaceId, rawQuestion: string, ip: string, history: Turn[], opts: AnswerOptions = {}, trace?: Trace): Promise<Answer> {
  const w = WORKSPACES[workspace];
  const question = rawQuestion.trim().slice(0, 500);
  if (!question) return none('error', 'Type a question and I will do my best.');
  const settings = await getAssistantSettings(workspace);

  // 1. Limits: 20 messages per 10 minutes per visitor, and a daily ceiling for the whole demo.
  const key = `chat:${workspace}:${ip}`;
  if (!opts.test && !(await rateLimit(key, 20, 10 * 60000))) return none('ratelimit', "You've sent a lot of messages in a short time. Please wait a moment, then try again.", { waitSeconds: await waitSeconds(key) });

  // 2. Messages that never need a source.
  if (hasContactDetails(question)) {
    return none('handover', "To keep your details safe, please don't type them here. Use the short form instead and a person will get back to you.");
  }
  // The owner's refused topics are for customers. Staff need to ask about discounts, claims and the like.
  if (!opts.staff && refusedPattern(settings.refused).test(question)) return none('off', `That's outside what I can help with. I can answer questions about ${w.business}'s solar packages, prices, installation and warranty.`);
  if (wordCount(question) <= 6 && THANKS.test(question)) return none('chat', "You're welcome. Anything else you'd like to know about going solar?");
  if (wordCount(question) <= 4 && HELLO.test(question)) return none('chat', `Hello! Ask me about ${w.business}'s packages, prices, installation or warranty.`);

  // 3. Find the passages. Live items (and approved ones when testing a draft); staff-only items only for staff.
  await connectDB();
  const rows = await KnowledgeItem.find({ workspace, status: { $in: opts.draft ? ['live', 'approved'] : ['live'] }, ...(opts.staff ? {} : { staffOnly: false }) }).sort({ order: 1 }).lean();
  // A live item that a waiting item disagrees with is not quoted until the owner resolves it.
  const disputed = new Set((await KnowledgeItem.find({ workspace, status: 'pending', conflictWith: { $ne: null } }, { conflictWith: 1 }).lean()).map((r) => String(r.conflictWith)));
  const items = rows.filter((r) => !disputed.has(String(r._id))).map((r) => ({ id: String(r._id), title: r.title, text: r.text, sourceName: r.sourceName, link: r.link ?? null, staffOnly: r.staffOnly }));
  // A follow-up like "and the second one?" needs the previous question for context.
  const lastUser = [...history].reverse().find((t) => t.role === 'user')?.text ?? '';
  const asked = wordCount(question) <= 4 && lastUser ? `${lastUser} ${question}` : question;
  const ranked = rank(asked, items);
  // With a model, word matching only chooses what it reads. A paraphrase ('spread the payments') may score low,
  // so the model gets the closest few passages (or the first few) and decides for itself whether they answer the question.
  const pool = ranked.length ? ranked : items.map((item) => ({ item, score: 0, coverage: 0 }));
  const top = llmEnabled() ? pool.slice(0, MODEL_SOURCES) : ranked.slice(0, MAX_SOURCES);
  const best = top[0];
  if (trace) {
    trace.coverage = best?.coverage ?? 0;
    const hit = rank(asked, rows.filter((r) => disputed.has(String(r._id))).map((r) => ({ id: String(r._id), title: r.title, text: r.text, sourceName: r.sourceName })))[0];
    trace.disputed = Boolean(hit && hit.coverage >= 0.3);
  }

  const unknown = async () => {
    if (!opts.test) await logUnanswered(workspace, question);
    return none('unknown', "I'm not sure about that, and I don't want to guess. I can pass your question to the team.");
  };
  if (!best || (!llmEnabled() && best.coverage < COVERAGE_MIN)) return unknown();

  const asSource = (r: (typeof top)[number]): AnswerSource => ({ id: r.item.id, title: r.item.sourceName.replace(/\.(pdf|docx?|txt|md|csv)$/i, ''), passage: r.item.text.length > 220 ? `${r.item.text.slice(0, 217)}…` : r.item.text, ...(r.item.staffOnly ? { staff: true } : {}) });
  const uniqueSources = (rs: typeof top) => rs.map(asSource).filter((s, i, a) => a.findIndex((x) => x.title === s.title) === i);

  // 4. Let the model write the answer from those passages, if one is configured.
  if (llmEnabled()) {
    if (!(await rateLimit(`chat-day:${workspace}`, env.ASSISTANT_DAILY_LIMIT, 24 * 3600000))) {
      return none('error', 'The demo has reached its limit for today. Please try again tomorrow, or book a call and we will show you a live one.');
    }
    const passages = top.map((r, i) => ({ n: i + 1, title: r.item.title, sourceName: r.item.sourceName, text: r.item.text }));
    const out = await askModel(w.business, question, passages, history, settings.tone);
    if (out) {
      if (!out.can_answer || !out.answer.trim()) return unknown();
      const used = out.used.map((n) => top[n - 1]).filter(Boolean);
      const cited = used.length ? used : [best];
      return { kind: 'answer', text: out.answer.trim(), list: out.list?.length ? out.list : undefined, link: cited.find((r) => r.item.link)?.item.link ?? undefined, sources: uniqueSources(cited) };
    }
    // The model failed: fall through to quoting the source so the visitor still gets an answer.
  }

  // 5. No model: quote the best-matching passage.
  const chosen = top.filter((r) => r.coverage >= best.coverage * 0.85 && r.coverage >= COVERAGE_MIN);
  // Short passages are quoted whole; long ones are cut down to the sentences that match the question.
  const text = chosen.map((r) => (r.item.text.length <= 480 ? r.item.text : bestSentences(question, r.item.text, chosen.length > 1 ? 1 : 2))).join(' ');
  return { kind: 'answer', text, link: chosen.find((r) => r.item.link)?.item.link ?? undefined, sources: uniqueSources(chosen) };
}

const MAX_SAVED_MESSAGES = 60;

/** 'Visitor 9B71': a short, stable label that doesn't identify anyone. */
export const visitorLabel = (cid: string) => `Visitor ${createHash('sha1').update(cid).digest('hex').slice(0, 4).toUpperCase()}`;

/** Saves one question and its answer to the conversation, with contact details removed first. */
async function record(workspace: WorkspaceId, cid: string, question: string, a: Answer, channel: 'web' | 'staff', who?: { email: string; name: string }) {
  if (a.kind === 'ratelimit' || a.kind === 'error') return;
  const now = new Date();
  const { retentionDays } = await getAssistantSettings(workspace);
  const expiresAt = new Date(now.getTime() + retentionDays * 86400000);
  const flags: Record<string, boolean> = {};
  if (a.kind === 'unknown') flags['flags.unknown'] = true;
  if (a.kind === 'off') flags['flags.refused'] = true;
  const clean = redact(question);
  const msgs = [
    { role: 'user', text: clean, at: now },
    { mid: a.mid, role: 'assistant', text: [a.text, ...(a.list ?? [])].join(' '), at: now, kind: a.kind, sources: a.sources.map((s) => s.title) },
  ];
  try {
    await Conversation.updateOne(
      { workspace, cid, [`messages.${MAX_SAVED_MESSAGES - 1}`]: { $exists: false } },
      {
        $setOnInsert: { channel, visitor: who?.name ?? visitorLabel(cid), owner: who?.email ?? '', firstQuestion: clean.slice(0, 200), startedAt: now },
        $push: { messages: { $each: msgs } },
        $set: { lastAt: now, expiresAt, ...flags },
      },
      { upsert: true },
    );
  } catch (e) {
    // A full conversation (60 messages) fails the filter and tries to insert a duplicate: that is expected, not an error.
    if ((e as { code?: number }).code !== 11000) throw e;
  }
}

/** Answers one question and, when the visitor has a conversation id, saves the exchange. */
export async function answerQuestion(workspace: WorkspaceId, rawQuestion: string, ip: string, history: Turn[] = [], cid?: string, channel: 'web' | 'staff' = 'web', who?: { email: string; name: string }): Promise<Answer> {
  const a = await compute(workspace, rawQuestion, ip, history, { staff: channel === 'staff' });
  a.mid = randomUUID();
  if (cid) {
    try {
      await record(workspace, cid, rawQuestion.trim().slice(0, 500), a, channel, who);
    } catch (e) {
      console.error('[assistant] could not save the conversation:', (e as Error).message);
    }
  }
  return a;
}

export type WhySource = { name: string; where: string; status: 'live' | 'unpublished' | 'staff' | 'notlive'; quote: string };
export type TestResult = {
  answer: Answer;
  why: { confidence: number; label: string; note: string; sources: WhySource[]; fix: { label: string; href: string; text: string } | null };
  liveCount: number;
};

/** The owner trying the assistant: same answers customers get, plus a view of how it decided. Nothing is saved. */
export async function testAnswer(workspace: WorkspaceId, rawQuestion: string, history: Turn[], opts: { draft: boolean; staff: boolean }): Promise<TestResult> {
  const trace: Trace = { coverage: 0, disputed: false };
  const answer = await compute(workspace, rawQuestion, 'test', history, { test: true, ...opts }, trace);
  await connectDB();
  const all = await KnowledgeItem.find({ workspace, status: { $in: ['live', 'approved', 'pending'] } }).sort({ order: 1 }).lean();
  const read = rank(rawQuestion, all.map((r) => ({ id: String(r._id), title: r.title, text: r.text, sourceName: r.sourceName })))
    .filter((r) => r.coverage >= 0.25)
    .slice(0, 4)
    .map((r): WhySource => {
      const row = all.find((x) => String(x._id) === r.item.id)!;
      const status: WhySource['status'] = row.status === 'pending' ? 'notlive' : row.status === 'approved' ? 'unpublished' : row.staffOnly ? 'staff' : 'live';
      return { name: row.sourceName, where: row.status === 'pending' ? `${row.where || 'item'} · waiting for review` : row.where || '', status, quote: row.original?.split('\n')[0] || row.text };
    });

  const pct = Math.round(Math.min(1, trace.coverage) * 100);
  const answered = answer.kind === 'answer';
  const label = answer.kind === 'off' || answer.kind === 'chat' ? 'Not needed' : !answered ? `Not sure · ${pct}%` : pct >= 80 ? `Very sure · ${pct}%` : `Sure · ${pct}%`;
  let note = answered ? `It found ${answer.sources.length} live source${answer.sources.length === 1 ? '' : 's'} that cover the question.` : 'Nothing live covers this well enough, so it would not guess.';
  let fix: TestResult['why']['fix'] = { label: 'Add an answer', href: '/admin/assistant/unanswered', text: 'Add the answer in Unanswered, and it goes live straight away.' };
  if (answer.kind === 'off') { note = 'This is on a topic the owner chose to hand over, so it declined.'; fix = { label: 'Change refused topics', href: '/admin/assistant/settings', text: 'Topics it won’t answer are set in Assistant settings.' }; }
  else if (answer.kind === 'chat') { note = 'A greeting or thanks. It needs no source.'; fix = null; }
  else if (answered) { fix = null; }
  else if (trace.disputed) { note = 'Two sources gave different prices and you have not chosen one yet, so it would not quote either.'; fix = { label: 'Resolve the price conflict', href: '/admin/assistant/review', text: 'Choose the right price in Review & publish, then publish.' }; }

  const liveCount = await KnowledgeItem.countDocuments({ workspace, status: 'live', ...(opts.staff ? {} : { staffOnly: false }) });
  return { answer, why: { confidence: pct, label, note, sources: read, fix }, liveCount };
}
