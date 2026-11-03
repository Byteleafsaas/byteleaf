// Loads the made-up salon used to demo the WhatsApp booking assistant.
//   npm run seed-whatsapp
// Safe to re-run: the business, staff and services are matched by name and refreshed. Bookings are left alone.
import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';
import { WaBusiness, WaService, WaStaff } from '@/lib/server/models';

export const DEMO_SLUG = 'lerato';

const day = (start: string, end: string) => [{ start, end }];

async function main() {
  await connectDB();
  await WaBusiness.updateOne(
    { slug: DEMO_SLUG },
    {
      $set: {
        name: "Lerato's Braids & Beauty",
        // Tuesday to Friday 08:00 to 17:00, Saturday 08:00 to 15:00. Closed Sunday and Monday.
        hours: { 2: day('08:00', '17:00'), 3: day('08:00', '17:00'), 4: day('08:00', '17:00'), 5: day('08:00', '17:00'), 6: day('08:00', '15:00') },
        minNoticeMin: 120, bufferMin: 15, stepMin: 30, windowDays: 30, cancelWindowHours: 24, payNote: 'paid at the salon', replyNote: 'We usually reply within [X hours].', active: true,
      },
    },
    { upsert: true },
  );

  const lerato = await WaStaff.findOneAndUpdate({ business: DEMO_SLUG, name: 'Lerato' }, { $set: { hours: {}, active: true, order: 0 } }, { upsert: true, returnDocument: 'after' });
  const thabo = await WaStaff.findOneAndUpdate(
    { business: DEMO_SLUG, name: 'Thabo' },
    { $set: { hours: { 2: day('09:00', '16:00'), 4: day('09:00', '16:00'), 6: day('09:00', '15:00') }, active: true, order: 1 } },
    { upsert: true, returnDocument: 'after' },
  );

  const services = [
    { name: 'Knotless braids', minutes: 240, priceCents: 65000, staff: [lerato._id] },
    { name: "Kids' braids", minutes: 120, priceCents: 35000, staff: [lerato._id] },
    { name: 'Silk press', minutes: 90, priceCents: 38000, staff: [lerato._id, thabo._id] },
    { name: 'Gel nails', minutes: 60, priceCents: 28000, staff: [thabo._id, lerato._id] },
  ];
  for (const [order, s] of services.entries()) {
    await WaService.updateOne({ business: DEMO_SLUG, name: s.name }, { $set: { ...s, active: true, order } }, { upsert: true });
  }
  console.log(`Done: ${await WaService.countDocuments({ business: DEMO_SLUG })} services and ${await WaStaff.countDocuments({ business: DEMO_SLUG })} staff for ${DEMO_SLUG}.`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
