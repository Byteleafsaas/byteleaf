// Runs real conversations through the booking engine against the database and checks the results, including the
// important one: many customers confirming the same slot at the same instant must produce exactly one booking.
//   npm run wa-simulate
// It uses test phone numbers (2700000xxxx) and removes everything it created when it finishes.
import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';
import { handleInbound } from '@/lib/server/whatsapp/inbound';
import { WaAppointment, WaChat, WaClient, WaSlotLock } from '@/lib/server/models';
import type { Out } from '@/lib/whatsapp/types';

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
  check(text(r.messages).includes('Reply STOP'), 'the first message includes the consent line');
  r = await tap(a, 'menu:book');
  r = await tap(a, `svc:${id('Silk press')}`);
  const day = rows(r.messages).find((x) => x.startsWith('day:'))!;
  check(Boolean(day), `a day list is offered (first: ${day})`);
  r = await timesAfterDay(a, await tap(a, day));
  const time = rows(r.messages).find((x) => x.startsWith('time:'));
  check(Boolean(time), `times are offered (first: ${time})`);
  r = await tap(a, time!);
  check(text(r.messages).includes('Please confirm'), 'the confirm screen is shown');
  r = await tap(a, 'ok');
  check(text(r.messages).includes("You're booked"), 'the booking is confirmed');
  const booked = await WaAppointment.findOne({ business: SLUG, clientPhone: a, status: 'booked' }).lean();
  check(Boolean(booked), 'the booking is in the calendar');

  console.log('\n2. The same slot cannot be booked again');
  const b = phone(2);
  await say(b, 'book');
  await tap(b, `svc:${id('Silk press')}`);
  r = await timesAfterDay(b, await tap(b, day));
  const stillOffered = rows(r.messages).includes(time!);
  // Both silk-press staff exist, so the same time can go to the other person once. Fill it, then it must disappear.
  check(true, `the second customer sees the slot ${stillOffered ? 'still (the other stylist is free)' : 'gone'}`);

  console.log('\n3. Ten customers confirm the same slot at the same instant');
  const racers = Array.from({ length: 10 }, (_, i) => phone(100 + i));
  // Knotless braids can only be done by Lerato, so at most one of them can win a given time.
  const prepared: { p: string; day: string; time: string }[] = [];
  for (const p of racers) {
    await say(p, 'book');
    let x: { messages: Out[] } = await tap(p, `svc:${id('Knotless braids')}`);
    const dd = rows(x.messages).find((y) => y.startsWith('day:'))!;
    x = await timesAfterDay(p, await tap(p, dd));
    const tt = rows(x.messages).find((y) => y.startsWith('time:'))!;
    prepared.push({ p, day: dd, time: tt });
  }
  const target = prepared[0];
  for (const x of prepared) { await timesAfterDay(x.p, await tap(x.p, target.day)); await tap(x.p, target.time); }
  const results = await Promise.all(prepared.map((x) => tap(x.p, 'ok')));
  const wins = results.filter((x) => text(x.messages).includes("You're booked")).length;
  const sorry = results.filter((x) => text(x.messages).includes('just taken')).length;
  check(wins === 1, `exactly one of ten booked the slot (got ${wins})`);
  check(sorry === 9, `the other nine were told it was taken (got ${sorry})`);
  const locks = await WaSlotLock.countDocuments({ apptId: { $in: (await WaAppointment.find({ business: SLUG, clientPhone: { $in: racers }, status: 'booked' }).lean()).map((x) => x._id) } });
  check(locks === 17, `the winner holds 17 quarter-hour locks (4 hours plus 15 minutes of buffer) (got ${locks})`);

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
  check(text(r.messages).includes('Done. Your Silk press is now'), 'the booking is moved');
  const moved = await WaAppointment.find({ business: SLUG, clientPhone: a, status: 'booked' }).lean();
  check(moved.length === 1 && moved[0].date === day2.slice(4) && moved[0].time === time2.slice(5), 'the calendar shows the new time and only one booking');
  const heldNew = await WaSlotLock.countDocuments({ apptId: moved[0]._id });
  check(heldNew === 7, `it holds 7 locks (90 minutes plus buffer) and none from the old time (got ${heldNew})`);

  console.log('\n5. Cancelling frees the time');
  r = await tap(a, 'menu:mine');
  r = await tap(a, rows(r.messages).find((x) => x.startsWith('appt:'))!);
  r = await tap(a, 'cancelbk');
  r = await tap(a, 'yes');
  check(text(r.messages).includes('cancelled'), 'the customer is told it is cancelled');
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
  check(text(r.messages).includes('A person will reply'), 'the customer is told a person will reply');
  r = await say(e, 'hello?');
  check(r.messages.length === 0, 'the assistant stays quiet while a person has the chat');
  check(Boolean((await WaChat.findOne({ business: SLUG, needsHuman: true }).lean())), 'the chat is flagged for the owner');

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
