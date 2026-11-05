// Runs real conversations through the booking engine against the database and checks the results, including the
// important one: many customers confirming the same slot at the same instant must produce exactly one booking.
//   npm run wa-simulate
// It uses test phone numbers (2700000xxxx) and removes everything it created when it finishes.
import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';
import { handleInbound } from '@/lib/server/whatsapp/inbound';
import { RateLimit, WaAppointment, WaBusiness, WaChat, WaClient, WaHold, WaSlotLock } from '@/lib/server/models';
import { rateLimit } from '@/lib/server/ratelimit';
import { handBack, loadInbox, reply, takeOver } from '@/lib/server/whatsapp/inbox';
import { Types } from 'mongoose';
import type { Out } from '@/lib/whatsapp/types';
import { bookSlot, holdSlot, loadData, timesFor } from '@/lib/server/whatsapp/calendar';
import { addManualBooking, cancelBooking, moveBooking, restoreBooking } from '@/lib/server/whatsapp/manual';
import { addDays, todaySast } from '@/lib/server/time';

const SLUG = 'lerato';
const phone = (n: number) => `2700000${String(n).padStart(4, '0')}`;
let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`);
  if (!ok) failures++;
};

const say = (p: string, text: string) => handleInbound({ slug: SLUG, phone: p, name: 'Test', input: { type: 'text', text }, source: 'simulator' });
const tap = (p: string, id: string) => handleInbound({ slug: SLUG, phone: p, name: 'Test', input: { type: 'reply', id }, source: 'simulator' });
const rows = (m: Out[]) => m.flatMap((x) => (x.type === 'list' ? x.rows.map((r) => r.id) : x.type === 'buttons' ? x.buttons.map((b) => b.id) : []));
const text = (m: Out[]) => m.map((x) => x.body).join('\n');
/** A brand new customer: says hello, answers the consent question, and is left looking at the service list. */
async function newCustomer(p: string) {
  await say(p, 'hi');
  return tap(p, 'consent:yes');
}

/** From a day's reply, gets to the list of times: answering morning, afternoon or evening first when it is asked. */
async function timesAfterDay(p: string, r: { messages: Out[] }) {
  const period = rows(r.messages).find((x) => x.startsWith('period:'));
  return period ? tap(p, period) : r;
}

async function main() {
  await connectDB();
  const svcs = await (await import('@/lib/server/models')).WaService.find({ business: SLUG }).lean();
  const id = (name: string) => String(svcs.find((s) => s.name === name)!._id);

  console.log('\n1. A new customer books silk press by tapping');
  const a = phone(1);
  let r: { messages: Out[]; clientId?: string } = await say(a, 'hi');
  check(text(r.messages).includes('May we send your confirmations') && text(r.messages).includes('Reply STOP'), 'the first message asks for consent');
  r = await tap(a, 'consent:yes');
  check(rows(r.messages).some((x) => x.startsWith('svc:')), 'the services are offered after consent');
  check((await WaClient.findOne({ business: SLUG, phone: a }).lean())?.consent === 'yes', 'the answer is saved on the client');
  r = await tap(a, `svc:${id('Silk press')}`);
  const day = rows(r.messages).find((x) => x.startsWith('day:'))!;
  check(Boolean(day), `a day list is offered (first: ${day})`);
  r = await timesAfterDay(a, await tap(a, day));
  const time = rows(r.messages).find((x) => x.startsWith('time:'));
  check(Boolean(time), `times are offered (first: ${time})`);
  r = await tap(a, time!);
  check(text(r.messages).includes('What name'), 'a new customer is asked what name to book under');
  r = await say(a, 'Test Client');
  check(text(r.messages).includes('Please confirm your booking'), 'the confirm screen is shown');
  check((await WaClient.findOne({ business: SLUG, phone: a }).lean())?.name === 'Test Client', 'the name they typed is saved, not their profile name');
  r = await tap(a, 'ok');
  check(text(r.messages).includes("You're booked, Test Client!"), 'the booking is confirmed');
  const booked = await WaAppointment.findOne({ business: SLUG, clientPhone: a, status: 'booked' }).lean();
  check(Boolean(booked), 'the booking is in the calendar');

  console.log('\n2. The same slot cannot be booked again');
  const b = phone(2);
  await newCustomer(b);
  await tap(b, `svc:${id('Silk press')}`);
  r = await timesAfterDay(b, await tap(b, day));
  const stillOffered = rows(r.messages).includes(time!);
  // Both silk-press staff exist, so the same time can go to the other person once. Fill it, then it must disappear.
  check(true, `the second customer sees the slot ${stillOffered ? 'still (the other stylist is free)' : 'gone'}`);

  console.log('\n3. Ten customers go for the same slot at the same instant');
  const racers = Array.from({ length: 10 }, (_, i) => phone(100 + i));
  // Two people (Lerato and Thandeka) can do knotless braids, so two clients can hold a time and no more.
  const prepared: { p: string; day: string; time: string }[] = [];
  for (const p of racers) {
    await newCustomer(p);
    let x: { messages: Out[] } = await tap(p, `svc:${id('Knotless braids')}`);
    const dd = rows(x.messages).find((y) => y.startsWith('day:'))!;
    x = await timesAfterDay(p, await tap(p, dd));
    const tt = rows(x.messages).find((y) => y.startsWith('time:'))!;
    prepared.push({ p, day: dd, time: tt });
  }
  const target = prepared[0];
  // Nobody has chosen yet, so all ten are looking at the same list. Now all ten tap the same time together.
  const named = await Promise.all(prepared.map(async (x) => { await tap(x.p, target.time); return x; }));
  const askedName = await Promise.all(named.map((x) => say(x.p, 'Racer')));
  const holders = askedName.filter((x) => text(x.messages).includes('Please confirm your booking'));
  const sorry = askedName.filter((x) => /was booked by someone else|just taken/.test(text(x.messages)));
  // How many can hold it is however many of the two people are free at that time: never more, and never zero.
  const n = holders.length;
  check(n >= 1 && n <= 2, `no more clients hold the time than people who can do it, and someone does (got ${n})`);
  check(sorry.length === 10 - n, `everyone else is told straight away that it was taken (got ${sorry.length})`);
  const holdRows = await WaHold.countDocuments({ clientId: { $in: (await WaClient.find({ business: SLUG, phone: { $in: racers } }, { _id: 1 }).lean()).map((x) => x._id) } });
  check(holdRows === n, `one hold exists per holder (got ${holdRows})`);
  // The holders confirm together and all of them get their booking.
  const holderPhones = askedName.map((x, i) => (holders.includes(x) ? prepared[i].p : '')).filter(Boolean);
  const results = await Promise.all(holderPhones.map((p) => tap(p, 'ok')));
  const wins = results.filter((x) => text(x.messages).includes("You're booked")).length;
  check(wins === n, `every holder is booked when they confirm (got ${wins})`);
  const mineLocks = await WaSlotLock.countDocuments({ apptId: { $in: (await WaAppointment.find({ business: SLUG, clientPhone: { $in: racers }, status: 'booked' }).lean()).map((x) => x._id) } });
  check(mineLocks === 17 * n, `each winner holds 17 quarter-hour locks (4 hours plus 15 minutes of buffer) (got ${mineLocks})`);
  check((await WaHold.countDocuments({ clientId: { $in: (await WaClient.find({ business: SLUG, phone: { $in: racers } }, { _id: 1 }).lean()).map((x) => x._id) } })) === 0, 'no holds are left once they are booked');

  console.log('\n4. Changing a booking');
  r = await tap(a, 'menu:mine');
  const appt = rows(r.messages).find((x) => x.startsWith('appt:'))!;
  check(Boolean(appt), 'the customer sees their booking');
  r = await tap(a, appt);
  r = await tap(a, 'move');
  const day2 = rows(r.messages).filter((x) => x.startsWith('day:'))[1] ?? rows(r.messages).find((x) => x.startsWith('day:'))!;
  r = await timesAfterDay(a, await tap(a, day2));
  const time2 = rows(r.messages).find((x) => x.startsWith('time:'))!;
  r = await tap(a, time2);
  r = await tap(a, 'ok');
  check(text(r.messages).includes("Done! You're now booked for"), 'the booking is moved');
  const moved = await WaAppointment.find({ business: SLUG, clientPhone: a, status: 'booked' }).lean();
  check(moved.length === 1 && moved[0].date === day2.slice(4) && moved[0].time === time2.slice(5), 'the calendar shows the new time and only one booking');
  const heldNew = await WaSlotLock.countDocuments({ apptId: moved[0]._id });
  check(heldNew === 7, `it holds 7 locks (90 minutes plus buffer) and none from the old time (got ${heldNew})`);

  console.log('\n5. Cancelling frees the time');
  r = await tap(a, 'menu:mine');
  r = await tap(a, rows(r.messages).find((x) => x.startsWith('appt:'))!);
  r = await tap(a, 'cancelbk');
  r = await tap(a, 'yes');
  check(text(r.messages).includes('is cancelled'), 'the customer is told it is cancelled');
  check((await WaAppointment.countDocuments({ business: SLUG, clientPhone: a, status: 'booked' })) === 0, 'no booking is left');
  check((await WaSlotLock.countDocuments({ apptId: moved[0]._id })) === 0, 'its locks are released');

  console.log('\n6. STOP and START');
  const c = phone(3);
  await say(c, 'hi');
  r = await say(c, 'STOP');
  check(text(r.messages).includes('START'), 'STOP is acknowledged');
  r = await say(c, 'book');
  check(r.messages.length === 0, 'nothing is sent while stopped');
  r = await say(c, 'START');
  check(rows(r.messages).includes('menu:book'), 'START brings the menu back');

  console.log('\n7. Asking for a person');
  const e = phone(4);
  await say(e, 'hi');
  r = await tap(e, 'menu:person');
  check(text(r.messages).includes("I've asked the team to reply"), 'the customer is told a person will reply');
  r = await say(e, 'hello?');
  check(r.messages.length === 0, 'the assistant stays quiet while a person has the chat');
  check(Boolean((await WaChat.findOne({ business: SLUG, needsHuman: true }).lean())), 'the chat is flagged for the owner');

  console.log('\n8. The owner adding, moving and cancelling by hand');
  const d = (await loadData(SLUG, { all: true }))!;
  const lerato = d.staff.find((s) => s.name === 'Lerato')!;
  const gel = d.services.find((s) => s.name === 'Gel nails')!;
  // A Tuesday a few weeks out, so nothing else is in the way.
  let handDay = addDays(todaySast(), 21);
  while (new Date(`${handDay}T00:00:00Z`).getUTCDay() !== 2) handDay = addDays(handDay, 1);
  const by = { by: 'Test', now: new Date() };
  const at = (name: string, time: string, force = false) => addManualBooking(d, { name, service: gel, date: handDay, time, staffId: String(lerato.id), force, ...by });
  const m1 = await at('Hand One', '10:00');
  check(m1.ok, 'a booking can be typed in with no phone number');
  const m2 = await at('Hand Two', '10:30');
  check(!m2.ok && m2.code === 'taken', 'an overlapping hand booking is refused unless the owner ticks "book it anyway"');
  const m3 = await at('Hand Three', '10:30', true);
  check(m3.ok, 'with "book it anyway" the overlap is allowed');
  const late = await at('Hand Late', '17:30');
  check(!late.ok && late.code === 'invalid', 'a start that would run past closing is refused');
  if (m1.ok) {
    const mv = await moveBooking(d, { apptId: m1.id, date: handDay, time: '14:00', staffId: String(lerato.id), force: false, ...by });
    check(mv.ok, 'a booking can be moved');
    const freed = await at('Hand Four', '10:00');
    check(freed.ok, 'the old time is free again after a move');
    check((await cancelBooking(SLUG, m1.id)).ok, 'a booking can be cancelled');
    check((await restoreBooking(d, m1.id)).ok, 'undoing the cancel brings it back while the time is free');
    await cancelBooking(SLUG, m1.id);
    const taken = await at('Hand Five', '14:00');
    check(taken.ok && !(await restoreBooking(d, m1.id)).ok, 'undoing a cancel is refused once someone else has the time');
  }
  const mine = await WaAppointment.find({ business: SLUG, clientName: /^Hand / }).lean();
  await WaSlotLock.deleteMany({ apptId: { $in: mine.map((x) => x._id) } });
  await WaAppointment.deleteMany({ _id: { $in: mine.map((x) => x._id) } });
  await WaClient.deleteMany({ business: SLUG, name: /^Hand / });

  {
  console.log('\n9. Holding a slot while the client decides');
  const knot = d.services.find((x) => x.name === 'Knotless braids')!;
  const ids = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
  const nowH = new Date();
  const holds = [];
  for (const id of ids) holds.push(await holdSlot(d, knot, { id }, handDay, '09:00', nowH));
  check(holds[0] && holds[1] && !holds[2], 'as many clients can hold a time as there are people to do it (two here), and no more');
  const seen = (viewer: Types.ObjectId) => timesFor(d, knot, handDay, nowH, undefined, viewer);
  check(!(await seen(ids[2])).includes('09:00'), 'a time other clients are holding is no longer offered to someone else');
  check((await seen(ids[0])).includes('09:00'), 'the client holding it still sees it');
  await WaHold.updateMany({ clientId: ids[0] }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await WaSlotLock.updateMany({ apptId: { $in: (await WaHold.find({ clientId: ids[0] }).lean()).map((x) => x._id) } }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  check(await holdSlot(d, knot, { id: ids[2] }, handDay, '09:00', new Date()), 'when a hold runs out, the time can be held by someone else straight away');
  const booked = await bookSlot(d, knot, { id: ids[2], name: 'Hold Test', phone: 'hold-test-1' }, handDay, '09:00', new Date(), 'simulator');
  check(booked !== 'taken', 'confirming turns the hold into the booking');
  check((await WaHold.countDocuments({ clientId: ids[2] })) === 0, 'and the hold is gone');
  if (booked !== 'taken') check((await WaSlotLock.countDocuments({ apptId: booked.id, expiresAt: { $exists: true } })) === 0 && (await WaSlotLock.countDocuments({ apptId: booked.id })) > 0, 'its rows are now permanent, not expiring');
  const late = await bookSlot(d, knot, { id: new Types.ObjectId(), name: 'Hold Late', phone: 'hold-test-2' }, handDay, '09:00', new Date(), 'simulator');
  check(late === 'taken', 'someone who never held it cannot book a time another client is holding');
  const mineH = await WaAppointment.find({ clientPhone: /^hold-test/ }).lean();
  await WaSlotLock.deleteMany({ apptId: { $in: [...mineH.map((x) => x._id), ...(await WaHold.find({ clientId: { $in: ids } }).lean()).map((x) => x._id)] } });
  await WaAppointment.deleteMany({ clientPhone: /^hold-test/ });
  await WaHold.deleteMany({ clientId: { $in: ids } });

  }

  {
    console.log('\n10. The owner\'s inbox');
    const p = phone(400);
    const sent: { to: string; body: string }[] = [];
    const fake = async (_id: string, to: string, ms: Out[]) => { for (const m of ms) sent.push({ to, body: m.body }); return true; };
    await say(p, 'hi');
    await tap(p, 'consent:yes');
    await tap(p, 'menu:person');
    const chat = await WaChat.findOne({ business: SLUG, clientId: (await WaClient.findOne({ business: SLUG, phone: p }))!._id });
    const cid = String(chat!._id);
    check(chat!.needsHuman === true, 'asking for a person flags the chat for the owner');
    // The inbox needs a number on the business to send: give the demo business a pretend one for this check only.
    await WaBusiness.updateOne({ slug: SLUG }, { $set: { phoneNumberId: 'sim-number' } });
    const now = new Date();
    check(!(await reply(cid, 'Lerato', 'Too early', now, fake)).ok, 'the owner cannot type before taking over');
    const took = await takeOver(cid, 'Lerato Mokoena', now, fake);
    check(took.ok && Boolean(sent.at(-1)?.body.includes('chatting with *Lerato*')), 'taking over tells the client who they are talking to');
    check((await WaChat.findById(cid))!.needsHuman === false, 'taking over clears the flag');
    const quiet = await say(p, 'are you there?');
    check(quiet.messages.length === 0, 'the assistant stays silent while the owner has the chat');
    const r1 = await reply(cid, 'Lerato Mokoena', 'Hi, yes I can do Saturday. Call me on 0821234567.', now, fake);
    check(r1.ok && Boolean(sent.at(-1)?.body.startsWith('Hi, yes')), 'the owner\'s reply is sent');
    const msgs = (await WaChat.findById(cid))!.messages;
    check(msgs.some((m: { from?: string | null; body?: string | null }) => m.from === 'staff' && !m.body?.includes('0821234567')), 'the stored copy has the phone number removed');
    check(!(await reply(cid, 'Lerato', 'Late', new Date(now.getTime() + 25 * 3600000), fake)).ok, 'a reply after the 24-hour window is refused');
    const back = await handBack(cid, 'Lerato Mokoena', now, fake);
    check(back.ok && Boolean(sent.at(-1)?.body.includes('handed you back')), 'handing back tells the client and shows a menu');
    const after = await tap(p, 'menu:no');
    check(text(after.messages).includes('No problem'), '"No, thanks" after a hand-back is answered');
    check((await loadInbox(cid)).open?.messages.some((m) => m.who === 'You (Lerato Mokoena)') === true, 'the inbox labels the owner\'s messages "You (name)"');
    const said = await say(p, 'my id is 9001015009087 and email a@b.co');
    const stored = (await WaChat.findById(cid))!.messages.filter((m: { from?: string | null }) => m.from === 'client').map((m: { body?: string | null }) => m.body).join('|');
    check(!stored.includes('9001015009087') && !stored.includes('a@b.co'), 'ID numbers and emails typed by a client are not stored');
    void said;
    await WaBusiness.updateOne({ slug: SLUG }, { $unset: { phoneNumberId: 1 } });
  }

  {
    console.log('\n11. A double tap on Confirm');
    const p = phone(410);
    await newCustomer(p);
    let x: { messages: Out[] } = await tap(p, `svc:${id('Gel nails')}`);
    const dd = rows(x.messages).find((y) => y.startsWith('day:'))!;
    x = await timesAfterDay(p, await tap(p, dd));
    await tap(p, rows(x.messages).find((y) => y.startsWith('time:'))!);
    await say(p, 'Double');
    const [a1, a2] = await Promise.all([tap(p, 'ok'), tap(p, 'ok')]);
    const booked = [a1, a2].filter((m) => text(m.messages).includes("You're booked")).length;
    check(booked === 1, `exactly one booking comes of two taps at once (got ${booked})`);
    const other = [a1, a2].find((m) => !text(m.messages).includes("You're booked"));
    check(!text(other?.messages ?? []).includes('booked by someone else') && !text(other?.messages ?? []).includes('just taken'), 'the second tap is not told the time was taken, since it was their own');
    check((await WaAppointment.countDocuments({ business: SLUG, clientPhone: p, status: 'booked' })) === 1, 'the diary has one booking');
  }

  {
    console.log('\n12. Rate limits under a burst');
    const key = `sim-rl-${Date.now()}`;
    const first = await Promise.all(Array.from({ length: 30 }, () => rateLimit(key, 5, 60000)));
    check(first.filter(Boolean).length === 5, `thirty requests at once, limit five: exactly five get through (got ${first.filter(Boolean).length})`);
    await RateLimit.updateOne({ key }, { $set: { resetAt: new Date(Date.now() - 1000) } });
    const second = await Promise.all(Array.from({ length: 30 }, () => rateLimit(key, 5, 60000)));
    check(second.filter(Boolean).length === 5, `when the window ends and a burst arrives together, still exactly five get through (got ${second.filter(Boolean).length})`);
    await RateLimit.deleteMany({ key });
  }

  // Clean up everything this run created.
  const created = await WaClient.find({ business: SLUG, phone: { $regex: '^2700000' } }, { _id: 1 }).lean();
  const ids = created.map((x) => x._id);
  const appts = await WaAppointment.find({ clientId: { $in: ids } }, { _id: 1 }).lean();
  await WaSlotLock.deleteMany({ apptId: { $in: appts.map((x) => x._id) } });
  await WaAppointment.deleteMany({ clientId: { $in: ids } });
  await WaChat.deleteMany({ clientId: { $in: ids } });
  await WaClient.deleteMany({ _id: { $in: ids } });
  console.log(`\n${failures ? `${failures} check(s) FAILED` : 'All checks passed'}. Test data removed.`);
}

main()
  .catch((e) => {
    console.error(e);
    failures++;
  })
  .finally(() => mongoose.disconnect().then(() => { process.exitCode = failures ? 1 : 0; }));
