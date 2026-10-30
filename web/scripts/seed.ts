// DEV ONLY: fill the database with the fictional sample data from the designs so the admin looks like the screenshots.
//   npm run seed            (adds sample data to an EMPTY database)
//   npm run seed -- --reset (wipes bookings, messages, projects, clients, documents and settings first)
// Never run this against production.
import mongoose from 'mongoose';
import { SEED_BOOKINGS, SEED_MESSAGES, SEED_PROJECTS, SEED_SETTINGS } from '@/lib/admin/mock';
import { SEED_CLIENTS, SEED_DOCUMENTS } from '@/lib/admin/mock-billing';
import { connectDB } from '@/lib/server/db';
import { env, isProd } from '@/lib/server/env';
import { BillingDocument, Booking, Client, Message, Project, SettingsModel } from '@/lib/server/models';
import { sastToUtc } from '@/lib/server/time';

async function main() {
  if (isProd) throw new Error('Refusing to seed in production.');
  await connectDB();
  const reset = process.argv.includes('--reset');
  const [b, m, p, c, d] = await Promise.all([Booking.countDocuments(), Message.countDocuments(), Project.countDocuments(), Client.countDocuments(), BillingDocument.countDocuments()]);
  if (!reset && b + m + p + c + d > 0) throw new Error('Database is not empty. Use --reset to wipe and reseed.');
  if (reset) {
    await Promise.all([Booking.deleteMany({}), Message.deleteMany({}), Project.deleteMany({}), Client.deleteMany({}), BillingDocument.deleteMany({}), SettingsModel.deleteMany({})]);
  }

  await Booking.insertMany(
    SEED_BOOKINGS.map((x) => ({ ...x, id: undefined, startsAt: sastToUtc(x.date, x.time), history: x.history.map((h) => ({ text: h.text, at: new Date(), actor: 'admin' })) })),
  );
  const now = Date.now();
  await Message.insertMany(
    SEED_MESSAGES.map((x, i) => ({ ...x, id: undefined, createdAt: new Date(now - [2, 5, 26, 72, 240][i] * 3600000) })),
    { timestamps: false },
  );
  await Project.insertMany(SEED_PROJECTS.map((x, i) => ({ ...x, id: undefined, sortOrder: i })));

  const idMap = new Map<string, mongoose.Types.ObjectId>();
  const clients = await Client.insertMany(SEED_CLIENTS.map((x) => ({ ...x, id: undefined })));
  SEED_CLIENTS.forEach((x, i) => idMap.set(x.id, clients[i]._id as mongoose.Types.ObjectId));

  const docIds = new Map<string, mongoose.Types.ObjectId>();
  SEED_DOCUMENTS.forEach((x) => docIds.set(x.id, new mongoose.Types.ObjectId()));
  await BillingDocument.insertMany(
    SEED_DOCUMENTS.map((x) => ({
      ...x, _id: docIds.get(x.id), id: undefined, clientId: idMap.get(x.clientId), quoteId: x.quoteId ? docIds.get(x.quoteId) : null,
      lines: x.lines.map((l) => ({ description: l.description, detail: l.detail, quantity: l.quantity, rate: l.rate })),
      payments: x.payments.map((pay) => ({ amount: pay.amount, paidOn: pay.paidOn, method: pay.method })),
    })),
  );

  await SettingsModel.updateOne({ key: 'site' }, { $set: { ...SEED_SETTINGS, key: 'site', account: undefined } }, { upsert: true });
  console.log(`Seeded sample data into ${env.MONGODB_URI}`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
