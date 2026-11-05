import 'server-only';
import { T, fmtMid, relDay } from '@/lib/whatsapp/copy';
import { templatePayload, windowOpen } from '@/lib/whatsapp/cloud';
import { isDue, kindOf } from '@/lib/whatsapp/reminders';
import type { Out } from '@/lib/whatsapp/types';
import { connectDB } from '../db';
import { env } from '../env';
import { WaAppointment, WaBusiness, WaClient } from '../models';
import { todaySast } from '../time';
import { releaseOrphanLocks } from './calendar';
import { sendOut, sendRaw } from './send';

export type ReminderRun = { checked: number; sent: number; skipped: number };

/**
 * Sends the reminders that are due. Meant to be called every few minutes by a scheduler.
 * Inside WhatsApp's 24-hour window it sends a normal message with buttons; outside it, the approved template.
 */
export async function runReminders(now = new Date()): Promise<ReminderRun> {
  await connectDB();
  const out: ReminderRun = { checked: 0, sent: 0, skipped: 0 };
  await releaseOrphanLocks(now).catch((e) => console.error('[whatsapp] could not release stale slot locks:', (e as Error).message));
  const businesses = await WaBusiness.find({ active: true, phoneNumberId: { $exists: true, $ne: null } }).lean();

  for (const b of businesses) {
    const hours = b.reminderHours?.length ? b.reminderHours : [24, 2];
    const horizon = new Date(now.getTime() + Math.max(...hours) * 3600000);
    const appts = await WaAppointment.find({ business: b.slug, status: 'booked', startsAt: { $gt: now, $lte: horizon } }).lean();
    for (const a of appts) {
      for (const h of hours) {
        const sent = (a.reminders ?? []).map((r: { kind?: string | null }) => r.kind ?? '');
        if (!isDue({ startsAt: a.startsAt, createdAt: a.createdAt ?? a.startsAt, now, hours: h, sent })) continue;
        out.checked++;
        const client = await WaClient.findById(a.clientId).lean();
        if (!client || client.optedOut || client.consent === 'no') { out.skipped++; continue; }
        const id = String(a._id);
        // Claim this reminder before sending, so two overlapping scheduler runs can't both send it.
        const kind = kindOf(h);
        const claim = await WaAppointment.updateOne({ _id: a._id, status: 'booked', 'reminders.kind': { $ne: kind } }, { $push: { reminders: { kind, at: now } } });
        if (!claim.modifiedCount) { out.skipped++; continue; }
        const first = (client.name || '').split(' ')[0];
        let ok = false;
        if (windowOpen(client.lastInboundAt, now)) {
          const m: Out = { type: 'buttons', body: T.reminder(first || 'there', a.serviceName ?? '', b.name, relDay(a.date, todaySast(now)), a.date, a.time), footer: 'Reply STOP to opt out', buttons: [{ id: `remind:ok:${id}`, title: T.confirmBtn }, { id: `remind:move:${id}`, title: T.changeTime }, { id: `remind:cancel:${id}`, title: T.cancelBtn }] };
          ok = await sendOut(b.phoneNumberId!, client.phone, [m]);
        } else if (env.WHATSAPP_REMINDER_TEMPLATE) {
          ok = await sendRaw(b.phoneNumberId!, templatePayload(client.phone, env.WHATSAPP_REMINDER_TEMPLATE, env.WHATSAPP_TEMPLATE_LANG, [first || 'there', a.serviceName ?? '', fmtMid(a.date), a.time], [`remind:ok:${id}`, `remind:move:${id}`, `remind:cancel:${id}`]));
        } else {
          console.warn('[whatsapp] a reminder is due outside the 24-hour window but WHATSAPP_REMINDER_TEMPLATE is not set.');
        }
        if (ok) out.sent++;
        else {
          await WaAppointment.updateOne({ _id: a._id }, { $pull: { reminders: { kind } } }); // let the next run try again
          out.skipped++;
        }
      }
    }
  }
  return out;
}
