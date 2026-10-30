'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isSlotFree } from '@/lib/availability';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { mail } from '../emails';
import { toBooking, toSettings } from '../mappers';
import { Booking } from '../models';
import { getSettingsDoc } from '../settings';
import { sastToUtc } from '../time';

type Result = { ok: true } | { ok: false; error: string };
const idSchema = z.string().regex(/^[a-f0-9]{24}$/);

async function load(id: string) {
  await assertAdmin();
  await connectDB();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return null;
  return Booking.findById(parsed.data);
}
const note = (text: string) => ({ text, at: new Date(), actor: 'admin' });
const emailShape = (b: ReturnType<typeof toBooking>) => b;

export async function confirmBookingAction(id: string): Promise<Result> {
  const b = await load(id);
  if (!b) return { ok: false, error: 'Booking not found.' };
  if (b.status !== 'pending') return { ok: false, error: 'Only pending bookings can be confirmed.' };
  b.status = 'confirmed';
  b.history.push(note('Confirmed by Gerald'));
  await b.save();
  await mail.bookingConfirmedClient(emailShape(toBooking(b.toObject())));
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

const reschedSchema = z.object({
  id: idSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  message: z.string().max(1000).default(''),
});

export async function rescheduleBookingAction(input: z.input<typeof reschedSchema>): Promise<Result> {
  const p = reschedSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Pick a day and a time.' };
  const b = await load(p.data.id);
  if (!b) return { ok: false, error: 'Booking not found.' };
  if (!['pending', 'confirmed', 'rescheduled'].includes(b.status)) return { ok: false, error: "This booking can't be rescheduled." };

  // The new slot must really be free (settings + other bookings), ignoring this booking itself.
  const settings = await getSettingsDoc();
  const others = await Booking.find({ _id: { $ne: b._id }, status: { $in: ['pending', 'confirmed', 'rescheduled'] } }).lean();
  const a = toSettings(settings.toObject(), { name: '', email: '', twoStep: false }).availability;
  if (!isSlotFree({ ...a, minNotice: '1 hour' }, others, b.meetingType, p.data.date, p.data.time)) return { ok: false, error: 'That slot is no longer available. Pick another.' };

  const old = `${b.date} ${b.time}`;
  b.date = p.data.date;
  b.time = p.data.time;
  b.startsAt = sastToUtc(p.data.date, p.data.time);
  b.status = 'rescheduled';
  b.history.push(note(`Rescheduled from ${old} to ${p.data.date} ${p.data.time}`));
  await b.save();
  await mail.bookingRescheduledClient(emailShape(toBooking(b.toObject())), p.data.message);
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

const closeSchema = z.object({ id: idSchema, reason: z.string().max(1000).default('') });

/** Declines a pending booking or cancels a confirmed/rescheduled one. The client is emailed. */
export async function closeBookingAction(input: z.input<typeof closeSchema>): Promise<Result> {
  const p = closeSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Something went wrong.' };
  const b = await load(p.data.id);
  if (!b) return { ok: false, error: 'Booking not found.' };
  if (!['pending', 'confirmed', 'rescheduled'].includes(b.status)) return { ok: false, error: 'This booking is already closed.' };
  const declined = b.status === 'pending';
  b.status = 'cancelled';
  b.history.push(note(`${declined ? 'Declined' : 'Cancelled'} by Gerald`));
  await b.save();
  await mail.bookingClosedClient(emailShape(toBooking(b.toObject())), declined ? 'declined' : 'cancelled', p.data.reason);
  revalidatePath('/admin', 'layout');
  return { ok: true };
}
