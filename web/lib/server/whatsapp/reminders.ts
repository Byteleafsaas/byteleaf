import 'server-only';
import { T, fmtMid, relDay } from '@/lib/whatsapp/copy';
import { hasNumber } from '@/lib/whatsapp/calendar-model';
import { templatePayload, windowOpen } from '@/lib/whatsapp/cloud';
import { DEFAULT_HOUR, KIND, isDue } from '@/lib/whatsapp/reminders';
import type { Out } from '@/lib/whatsapp/types';
import { connectDB } from '../db';
import { env } from '../env';
import { WaAppointment, WaBusiness, WaClient, WaService } from '../models';
import { todaySast } from '../time';
import { releaseOrphanLocks } from './calendar';
import { sendOut, sendRaw } from './send';

export type ReminderRun = { checked: number; sent: number; skipped: number };

/**
 * Sends the reminders that are due. Meant to be called every few minutes by a scheduler.
 * Each booking gets one, the evening before at the business's reminder hour (18:00 by default).
 * Inside WhatsApp's 24-hour window it sends a normal message with buttons; outside it, the approved template.
 * A service with "keep the name out of messages" switched on is a clinic visit: the message says "your appointment with …".
 */
export async function runReminders(now = new Date()): Promise<ReminderRun> {
  await connectDB();
  const out: ReminderRun = { checked: 0, sent: 0, skipped: 0 };
  await releaseOrphanLocks(now).catch((e) => console.error('[whatsapp] could not release stale slot locks:', (e as Error).message));
  const businesses = await WaBusiness.find({ active: true, phoneNumberId: { $exists: true, $ne: null } }).lean();

  for (const b of businesses) {
    const hour = typeof b.reminderHour === 'number' ? b.reminderHour : DEFAULT_HOUR;
    // The reminder is never more than two days ahead of the appointment.
    const horizon = new Date(now.getTime() + 48 * 3600000);
    const appts = await WaAppointment.find({ business: b.slug, status: 'booked', startsAt: { $gt: now, $lte: horizon } }).lean();
    for (const a of appts) {
      const sent = (a.reminders ?? []).map((r: { kind?: string | null }) => r.kind ?? '');
      if (!isDue({ date: a.date, startsAt: a.startsAt, createdAt: a.createdAt ?? a.startsAt, now, hour, sent })) continue;
      out.checked++;
      const client = await WaClient.findById(a.clientId).lean();
      if (!client || client.optedOut || client.consent === 'no' || !hasNumber(client.phone)) { out.skipped++; continue; }
      const id = String(a._id);
      // Claim this reminder before sending, so two overlapping scheduler runs can't both send it.
      const claim = await WaAppointment.updateOne({ _id: a._id, status: 'booked', 'reminders.kind': { $ne: KIND } }, { $push: { reminders: { kind: KIND, at: now } } });
      if (!claim.modifiedCount) { out.skipped++; continue; }
      const first = (client.name || '').split(' ')[0] || 'there';
      const svc = await WaService.findById(a.serviceId, { hideName: 1 }).lean();
      const clinic = Boolean(svc?.hideName);
      const who = a.staffName || 'Dr [name]';
      const when = relDay(a.date, todaySast(now));
      let ok = false;
      if (windowOpen(client.lastInboundAt, now)) {
        const body = clinic ? T.reminderClinic(first, who, when, a.date, a.time) : T.reminder(first, a.serviceName ?? '', b.name, when, a.date, a.time);
        const m: Out = { type: 'buttons', body, footer: 'Reply STOP to opt out', buttons: [{ id: `remind:ok:${id}`, title: T.confirmBtn }, { id: `remind:move:${id}`, title: T.changeTime }, { id: `remind:cancel:${id}`, title: T.cancelBtn }] };
        ok = await sendOut(b.phoneNumberId!, client.phone, [m]);
      } else {
        const useClinic = clinic && Boolean(env.WHATSAPP_REMINDER_TEMPLATE_CLINIC);
        const name = useClinic ? env.WHATSAPP_REMINDER_TEMPLATE_CLINIC : env.WHATSAPP_REMINDER_TEMPLATE;
        if (name) {
          // The clinic template names the practitioner, never the reason for the visit. The plain one names the service.
          const params = useClinic ? [first, who, fmtMid(a.date), a.time] : [first, clinic ? 'Appointment' : a.serviceName ?? '', fmtMid(a.date), a.time];
          ok = await sendRaw(b.phoneNumberId!, templatePayload(client.phone, name, env.WHATSAPP_TEMPLATE_LANG, params, [`remind:ok:${id}`, `remind:move:${id}`, `remind:cancel:${id}`]));
        } else {
          console.warn('[whatsapp] a reminder is due outside the 24-hour window but WHATSAPP_REMINDER_TEMPLATE is not set.');
        }
      }
      if (ok) {
        out.sent++;
        await WaAppointment.updateOne({ _id: a._id }, { $set: { reminderFailedAt: null } });
      } else {
        await WaAppointment.updateOne({ _id: a._id }, { $pull: { reminders: { kind: KIND } }, $set: { reminderFailedAt: now } }); // let the next run try again, and tell the owner
        out.skipped++;
      }
    }
  }
  return out;
}
