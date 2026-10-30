import 'server-only';
import { computeAvailability, type AvailabilityMap } from '@/lib/availability';
import type { BillingDocument, Client } from '@/lib/admin/billing-types';
import type { Booking, Message, Project, Settings } from '@/lib/admin/types';
import { connectDB } from './db';
import { toBooking, toClient, toDocument, toMessage, toProject } from './mappers';
import { BillingDocument as DocModel, Booking as BookingModel, Client as ClientModel, Message as MessageModel, Project as ProjectModel } from './models';
import { getAdminSettings } from './settings';

export type AdminData = { bookings: Booking[]; messages: Message[]; projects: Project[]; settings: Settings; documents: BillingDocument[]; clients: Client[]; availability: AvailabilityMap };

/** Mark bookings whose end time has passed as completed (on read; a cron could also do this). */
export async function completePastBookings() {
  const now = new Date();
  const open = await BookingModel.find({ status: { $in: ['confirmed', 'rescheduled'] }, startsAt: { $lt: now } });
  for (const b of open) {
    if (b.startsAt.getTime() + b.durationMin * 60000 < now.getTime()) {
      b.status = 'completed';
      b.history.push({ text: 'Meeting held', at: now, actor: 'admin' });
      await b.save();
    }
  }
}

export async function loadAdminData(userId: string): Promise<AdminData> {
  await connectDB();
  await completePastBookings();
  const [bookings, messages, projects, documents, clients, settings] = await Promise.all([
    BookingModel.find().sort({ startsAt: 1 }).lean(),
    MessageModel.find().sort({ createdAt: -1 }).lean(),
    ProjectModel.find({ deletedAt: null }).sort({ featured: -1, sortOrder: 1, createdAt: 1 }).lean(),
    DocModel.find().sort({ createdAt: -1 }).lean(),
    ClientModel.find().sort({ company: 1 }).lean(),
    getAdminSettings(userId),
  ]);
  // Admin reschedule picker: same rules as the public page, but admins are not held to the minimum-notice window.
  const active = bookings.filter((b) => ['pending', 'confirmed', 'rescheduled'].includes(b.status));
  const availability = computeAvailability({ ...settings.availability, minNotice: '1 hour' }, active, { days: 90 });
  return {
    bookings: bookings.map(toBooking), messages: messages.map(toMessage), projects: projects.map(toProject),
    documents: documents.map(toDocument), clients: clients.map(toClient), settings, availability,
  };
}
