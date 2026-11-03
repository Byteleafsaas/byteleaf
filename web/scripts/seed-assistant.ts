// Loads the made-up Khumalo Home Solar knowledge so the demo assistant has something to answer from.
//   npm run seed-assistant
// Safe to re-run: sources and items are matched by name and title and refreshed. Anything the owner adds in the admin is left alone.
import mongoose from 'mongoose';
import { DEMO_KNOWLEDGE, DEMO_PROBLEMS, DEMO_SOURCES } from '@/lib/assistant/demo-knowledge';
import { connectDB } from '@/lib/server/db';
import { Conversation, KnowledgeItem, KnowledgeSource, Unanswered } from '@/lib/server/models';

const WORKSPACE = 'khumalo';

async function main() {
  await connectDB();
  const ids = new Map<string, mongoose.Types.ObjectId>();
  for (const s of DEMO_SOURCES) {
    const problem = DEMO_PROBLEMS[s.name];
    const when = new Date(Date.now() - s.updatedDaysAgo * 86400000);
    const doc = await KnowledgeSource.findOneAndUpdate(
      { workspace: WORKSPACE, name: s.name },
      {
        $set: {
          type: s.type, detail: s.detail, fileKind: s.fileKind ?? '', pages: s.pages ?? 0, staffOnly: s.staffOnly ?? false, createdBy: 'Gerald',
          state: problem?.state ?? 'ready', problem: problem?.problem ?? '', 'progress.stage': 'ready', updatedAt: when,
        },
      },
      { upsert: true, new: true, timestamps: false, setDefaultsOnInsert: true },
    );
    ids.set(s.name, doc._id as mongoose.Types.ObjectId);
    console.log(problem ? `source  ${s.name} (${problem.state})` : `source  ${s.name}`);
  }

  const itemIds = new Map<string, mongoose.Types.ObjectId>();
  for (const [order, it] of DEMO_KNOWLEDGE.entries()) {
    const doc = await KnowledgeItem.findOneAndUpdate(
      { workspace: WORKSPACE, title: it.title },
      {
        $set: {
          sourceId: ids.get(it.sourceName) ?? null, sourceName: it.sourceName, sourceType: it.sourceType, text: it.text, link: it.link ?? null, status: it.status ?? 'live', staffOnly: it.staffOnly ?? false, order,
          original: it.original ?? '', asks: it.asks ?? '', where: it.where ?? '', unsure: it.unsure ?? '', unsurePhrase: it.unsurePhrase ?? '', aiCleaned: Boolean(it.original), edited: false, conflictWith: null,
        },
      },
      { upsert: true, new: true },
    );
    itemIds.set(it.title, doc._id as mongoose.Types.ObjectId);
  }
  // Second pass: point disagreeing items at each other once every item has an id.
  for (const it of DEMO_KNOWLEDGE) {
    if (it.conflictWith) await KnowledgeItem.updateOne({ _id: itemIds.get(it.title) }, { $set: { conflictWith: itemIds.get(it.conflictWith) ?? null } });
  }
  // Questions the demo assistant couldn't answer, so Unanswered and the sidebar badge have something to show.
  const hours = (h: number) => new Date(Date.now() - h * 3600000);
  const demoQuestions = [
    { question: 'Do you fit solar geysers?', count: 7, handovers: 3, askedAs: ['solar water heater?', 'geyser + panels together?'], last: hours(2), status: 'open' },
    { question: 'Can you install on a thatch roof?', count: 4, handovers: 3, askedAs: ['thatched roof'], last: hours(26), status: 'open' },
    { question: 'Do you move my system if I move house?', count: 3, handovers: 1, askedAs: [], last: hours(24 * 6), status: 'open' },
    { question: 'Is there a call-out fee for repairs?', count: 2, handovers: 2, askedAs: ['repair cost'], last: hours(24 * 8), status: 'open' },
    { question: 'Do you offer finance?', count: 5, handovers: 0, askedAs: [], last: hours(24 * 12), status: 'done' },
    { question: 'Do you sell generators?', count: 1, handovers: 0, askedAs: [], last: hours(24 * 15), status: 'ignored' },
  ];
  for (const q of demoQuestions) {
    const key = q.question.toLowerCase().replace(/[^a-z0-9s]/g, ' ').replace(/s+/g, ' ').trim();
    await Unanswered.updateOne(
      { workspace: WORKSPACE, key },
      { $set: { question: q.question, askedAs: [q.question, ...q.askedAs], count: q.count, handovers: q.handovers, status: q.status, lastAskedAt: q.last, answeredAt: q.status === 'done' ? q.last : null } },
      { upsert: true },
    );
  }
  // A few saved chats, so the Conversations log has something to show. Fixed ids keep re-runs from duplicating them.
  type M = { role: 'user' | 'assistant'; text: string; kind?: string; sources?: string[]; rating?: 'up' | 'down'; reason?: string };
  const chats: { cid: string; visitor: string; channel: 'web' | 'staff'; hoursAgo: number; flags: Record<string, boolean>; messages: M[] }[] = [
    { cid: 'demo-chat-geyser', visitor: 'Visitor 4F2A', channel: 'web', hoursAgo: 2, flags: { unknown: true }, messages: [
      { role: 'user', text: 'Do you fit solar geysers?' }, { role: 'assistant', kind: 'unknown', text: "I'm not sure about that, and I don't want to guess. I can pass your question to the team." }, { role: 'user', text: 'ok thanks' } ] },
    { cid: 'demo-chat-family', visitor: 'Visitor 9B71', channel: 'web', hoursAgo: 5, flags: { notHelpful: true, handedOver: true }, messages: [
      { role: 'user', text: 'How much is the family package?' },
      { role: 'assistant', kind: 'answer', sources: ['Services and packages'], rating: 'down', reason: 'Wrong answer', text: 'The Family package (5 kW panels, 10 kWh battery) costs from R 118 500 installed.' },
      { role: 'user', text: 'your price list says 112 000. can someone call me on [phone removed]' },
      { role: 'assistant', kind: 'handover', text: "To keep your details safe, please don't type them here. Use the short form instead and a person will get back to you." } ] },
    { cid: 'demo-chat-pretoria', visitor: 'Visitor 22D0', channel: 'web', hoursAgo: 24 + 3, flags: {}, messages: [
      { role: 'user', text: 'Do you install in Pretoria?' },
      { role: 'assistant', kind: 'answer', sources: ['About Khumalo Home Solar'], rating: 'up', text: 'Yes. We install across Gauteng, including Johannesburg, Pretoria and the East Rand.' },
      { role: 'user', text: 'Great, how long does it take?' },
      { role: 'assistant', kind: 'answer', sources: ['Installation process'], text: 'Most homes take one to two days.' } ] },
    { cid: 'demo-chat-warranty', visitor: 'Sipho M.', channel: 'staff', hoursAgo: 24 + 8, flags: {}, messages: [
      { role: 'user', text: 'How do I log a warranty claim for a battery?' },
      { role: 'assistant', kind: 'answer', sources: ['Warranty terms'], text: 'Batteries carry a 10-year warranty. Log the claim with the serial number and the installation date.' } ] },
    { cid: 'demo-chat-discount', visitor: 'Visitor 7E13', channel: 'web', hoursAgo: 24 * 2 + 4, flags: { refused: true }, messages: [
      { role: 'user', text: 'Can I get a discount?' },
      { role: 'assistant', kind: 'off', text: "That's outside what I can help with. I can answer questions about Khumalo Home Solar's solar packages, prices, installation and warranty." } ] },
    { cid: 'demo-chat-finance', visitor: 'Visitor 0C9F', channel: 'web', hoursAgo: 24 * 2 + 5, flags: {}, messages: [
      { role: 'user', text: 'Can I pay it off monthly?' },
      { role: 'assistant', kind: 'answer', sources: ['Finance FAQ'], rating: 'up', text: 'You can spread the cost over 12 to 60 months through [finance partner]. Approval takes about two working days.' } ] },
  ];
  for (const ch of chats) {
    const start = hours(ch.hoursAgo);
    const last = new Date(start.getTime() + ch.messages.length * 40000);
    await Conversation.updateOne(
      { workspace: WORKSPACE, cid: ch.cid },
      {
        $set: {
          channel: ch.channel, visitor: ch.visitor, firstQuestion: ch.messages[0].text, startedAt: start, lastAt: last, expiresAt: new Date(last.getTime() + 30 * 86400000),
          flags: { unknown: false, notHelpful: false, handedOver: false, refused: false, ...ch.flags },
          messages: ch.messages.map((m, i) => ({ mid: m.role === 'assistant' ? `${ch.cid}-${i}` : undefined, role: m.role, text: m.text, at: new Date(start.getTime() + i * 40000), kind: m.kind ?? '', sources: m.sources ?? [], rating: m.rating ?? '', reason: m.reason ?? '' })),
        },
      },
      { upsert: true },
    );
  }
  console.log(`Done: ${await KnowledgeSource.countDocuments({ workspace: WORKSPACE })} sources, ${await KnowledgeItem.countDocuments({ workspace: WORKSPACE })} items in the Khumalo workspace.`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
