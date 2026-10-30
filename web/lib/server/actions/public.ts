'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isSlotFree } from '@/lib/availability';
import { clientInfo, rateLimit } from '../auth';
import { connectDB } from '../db';
import { mail } from '../emails';
import { toBooking, toMessage, toSettings } from '../mappers';
import { Booking, Message } from '../models';
import { getSettingsDoc } from '../settings';
import { sastToUtc } from '../time';

type Result = { ok: true } | { ok: false; error: string };
const trim = (max: number) => z.string().trim().max(max);

/* ---------- contact form ---------- */
const contactSchema = z.object({
  needs: z.array(trim(40)).max(10).default([]),
  name: trim(120).min(1, 'Please tell us your name.'),
  company: trim(120).default(''),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
  phone: trim(40).default(''),
  workType: trim(80).default(''),
  start: trim(80).default(''),
  message: trim(5000).default(''),
  trap: z.string().max(200).optional(), // honeypot: real people never fill this
});

export async function submitContactAction(input: z.input<typeof contactSchema>): Promise<Result> {
  const p = contactSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Please check the form.' };
  if (p.data.trap) return { ok: true }; // bot: pretend it worked
  const { ip } = await clientInfo();
  if (!(await rateLimit(`contact:${ip}`, 5, 60 * 60000))) return { ok: false, error: 'Too many messages from this connection. Please try again later.' };

  await connectDB();
  const d = p.data;
  const m = await Message.create({ name: d.name, company: d.company, email: d.email, phone: d.phone, needs: d.needs, model: d.workType, start: d.start, message: d.message });
  const settings = toSettings((await getSettingsDoc()).toObject(), { name: '', email: '', twoStep: false });
  const owner = settings.business.notifyEmail || settings.business.publicEmail;
  if (owner) {
    const dto = toMessage(m.toObject());
    await mail.newMessageOwner(owner, { id: dto.id, name: dto.name, company: dto.company, email: dto.email, needs: dto.needs, message: dto.message });
  } else {
    console.warn('[contact] New message saved, but no "send new bookings & messages to" email is set in Settings › Business.');
  }
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

/* ---------- booking ---------- */
const bookingSchema = z.object({
  meetingType: z.enum(['discovery', 'deep-dive', 'in-person']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: trim(120).min(1, 'Please tell us your name.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
  company: trim(120).default(''),
  note: trim(3000).default(''),
  trap: z.string().max(200).optional(),
});

export async function submitBookingAction(input: z.input<typeof bookingSchema>): Promise<Result> {
  const p = bookingSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Please check the form.' };
  if (p.data.trap) return { ok: true };
  const { ip } = await clientInfo();
  if (!(await rateLimit(`book:${ip}`, 6, 60 * 60000))) return { ok: false, error: 'Too many booking requests from this connection. Please try again later.' };

  await connectDB();
  const d = p.data;
  const settings = toSettings((await getSettingsDoc()).toObject(), { name: '', email: '', twoStep: false });
  const type = settings.availability.meetingTypes.find((m) => m.key === d.meetingType && m.enabled);
  if (!type) return { ok: false, error: "That meeting type isn't available." };

  // Re-check the slot on the server: the page may be stale, or someone else may have just taken it.
  const active = await Booking.find({ status: { $in: ['pending', 'confirmed', 'rescheduled'] }, date: { $gte: d.date } }).lean();
  if (!isSlotFree(settings.availability, active, d.meetingType, d.date, d.time)) {
    return { ok: false, error: 'Sorry, that time was just taken or is no longer available. Please pick another.' };
  }

  const b = await Booking.create({
    name: d.name, email: d.email, company: d.company, note: d.note, meetingType: d.meetingType, typeLabel: type.name, where: type.where, durationMin: type.minutes,
    date: d.date, time: d.time, startsAt: sastToUtc(d.date, d.time), status: 'pending', history: [{ text: 'Booked via website', actor: 'client' }],
  });
  const dto = toBooking(b.toObject());
  await mail.bookingReceivedClient(dto);
  const owner = settings.business.notifyEmail || settings.business.publicEmail;
  if (owner) await mail.bookingCreatedOwner(owner, dto);
  else console.warn('[book] Booking saved, but no "send new bookings & messages to" email is set in Settings › Business.');
  revalidatePath('/admin', 'layout');
  revalidatePath('/book');
  return { ok: true };
}
