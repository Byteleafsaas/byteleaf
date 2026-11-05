// Loads the made-up salon used to demo the WhatsApp booking assistant, with a week of made-up bookings for the calendar.
//   npm run seed-whatsapp
// Safe to re-run: the business, staff and services are matched by name and refreshed, and the made-up bookings are
// replaced each time so they always fall in the coming days. Real bookings (any other phone number) are left alone.
import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';
import { WaAppointment, WaBusiness, WaClient, WaService, WaSlotLock, WaStaff } from '@/lib/server/models';
import { bookSlot, loadData } from '@/lib/server/whatsapp/calendar';
import { addDays, todaySast } from '@/lib/server/time';

export const DEMO_SLUG = 'lerato';
/** Made-up numbers in the 27 000 range, which are not real South African numbers. */
const demoPhone = (n: number) => `2700100${String(n).padStart(4, '0')}`;

const day = (start: string, end: string) => [{ start, end }];

const CLIENTS = ['Lindiwe Mokoena', 'Ayanda Dlamini', 'Naledi Khumalo', 'Thandi Sithole', 'Nomsa Zulu', 'Palesa Molefe', 'Zanele Ndlovu', 'Busisiwe Mahlangu', 'Refilwe Mokone', 'Karabo Nkosi'];

async function main() {
  await connectDB();
  await WaBusiness.updateOne(
    { slug: DEMO_SLUG },
    {
      $set: {
        name: "Lerato's Braids & Beauty",
        brand: 'plum',
        // Tuesday to Friday 08:00 to 18:00, Saturday 08:00 to 16:00. Closed Sunday and Monday.
        hours: { 2: day('08:00', '18:00'), 3: day('08:00', '18:00'), 4: day('08:00', '18:00'), 5: day('08:00', '18:00'), 6: day('08:00', '16:00') },
        minNoticeMin: 120, bufferMin: 15, stepMin: 30, windowDays: 30, cancelWindowHours: 24, payNote: 'paid at the salon',
        address: '[Salon address], Randburg', privacyUrl: '[privacy link]', lateFee: 'R [amount]', replyTime: '[time]', active: true,
      },
    },
    { upsert: true },
  );

  const lerato = await WaStaff.findOneAndUpdate({ business: DEMO_SLUG, name: 'Lerato' }, { $set: { hours: {}, active: true, order: 0 } }, { upsert: true, returnDocument: 'after' });
  const thandeka = await WaStaff.findOneAndUpdate(
    { business: DEMO_SLUG, name: 'Thandeka' },
    { $set: { hours: { 2: day('09:00', '17:00'), 3: day('09:00', '17:00'), 4: day('09:00', '17:00'), 6: day('09:00', '15:00') }, active: true, order: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  // The earlier demo used a different second stylist: switch the old one off so it isn't offered.
  await WaStaff.updateMany({ business: DEMO_SLUG, name: 'Thabo' }, { $set: { active: false } });

  const services = [
    { name: 'Knotless braids', minutes: 240, priceCents: 65000, staff: [lerato._id, thandeka._id], waLine: '' },
    { name: "Kids' braids", minutes: 120, priceCents: 35000, staff: [lerato._id], waLine: '' },
    { name: 'Silk press', minutes: 90, priceCents: 38000, staff: [lerato._id, thandeka._id], waLine: '' },
    { name: 'Gel nails', minutes: 60, priceCents: 28000, staff: [thandeka._id, lerato._id], waLine: '' },
  ];
  for (const [order, s] of services.entries()) {
    await WaService.updateOne({ business: DEMO_SLUG, name: s.name }, { $set: { ...s, active: true, onWhatsApp: true, order } }, { upsert: true });
  }

  // Made-up bookings, replaced each run so the calendar always has something to show in the coming days.
  const old = await WaAppointment.find({ business: DEMO_SLUG, clientPhone: /^2700100/ }, { _id: 1 }).lean();
  await WaSlotLock.deleteMany({ apptId: { $in: old.map((a) => a._id) } });
  await WaAppointment.deleteMany({ business: DEMO_SLUG, clientPhone: /^2700100/ });

  const d = (await loadData(DEMO_SLUG))!;
  const now = new Date();
  const today = todaySast(now);
  const by = (name: string) => d.services.find((s) => s.name === name)!;
  // [days from today, start, service]; the salon is closed Sunday and Monday, so those days are skipped when they fall there.
  const plan: [number, string, string][] = [
    [1, '08:00', 'Knotless braids'], [1, '09:30', 'Silk press'], [1, '13:00', 'Gel nails'], [2, '08:00', "Kids' braids"], [2, '10:00', 'Gel nails'], [2, '13:30', 'Silk press'],
    [3, '08:00', 'Knotless braids'], [3, '14:00', 'Gel nails'], [4, '09:00', 'Silk press'], [4, '12:00', "Kids' braids"], [5, '08:00', 'Knotless braids'], [6, '10:30', 'Gel nails'],
  ];
  let made = 0;
  for (const [i, [offset, time, name]] of plan.entries()) {
    const date = addDays(today, offset);
    const phone = demoPhone(i);
    const client = await WaClient.findOneAndUpdate(
      { business: DEMO_SLUG, phone },
      { $set: { name: CLIENTS[i % CLIENTS.length], nameConfirmed: true, greeted: true, consent: 'yes', consentAt: now, lastInboundAt: i % 3 === 0 ? now : new Date(now.getTime() - 40 * 3600000) } },
      { upsert: true, returnDocument: 'after' },
    );
    const r = await bookSlot(d, by(name), { id: client._id, name: client.name, phone }, date, time, new Date(now.getTime() - 3 * 86400000), 'whatsapp');
    if (r === 'taken') continue;
    made++;
    // About half have been confirmed from a reminder; one was typed in by the owner.
    const set: Record<string, unknown> = {};
    if (i % 2 === 0) set.confirmedAt = now;
    if (i === 5) Object.assign(set, { source: 'manual', createdBy: 'Lerato' });
    if (Object.keys(set).length) await WaAppointment.updateOne({ _id: r.id }, { $set: set });
  }
  console.log(`Done: ${await WaService.countDocuments({ business: DEMO_SLUG, active: true })} services, ${await WaStaff.countDocuments({ business: DEMO_SLUG, active: true })} staff and ${made} demo bookings for ${DEMO_SLUG}.`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
