import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('../db', () => ({ connectDB: async () => {} }));
vi.mock('../env', () => ({ env: { WHATSAPP_REMINDER_TEMPLATE: 'remind', WHATSAPP_REMINDER_TEMPLATE_CLINIC: 'remind_clinic', WHATSAPP_TEMPLATE_LANG: 'en' } }));
const sendRaw = vi.fn();
vi.mock('./send', () => ({ sendOut: vi.fn(), sendRaw: (...a: unknown[]) => sendRaw(...a) }));
vi.mock('./calendar', () => ({ releaseOrphanLocks: async () => 0 }));

const appt = { _id: 'a1', clientId: 'c1', serviceName: 'Silk press', staffName: 'Lerato', serviceId: 's1', date: '2026-11-07', time: '10:00', startsAt: new Date('2026-11-07T08:00:00Z'), createdAt: new Date('2026-11-01T08:00:00Z'), reminders: [] as { kind: string }[] };
const updateOne = vi.fn();
const svc = { hideName: false };
vi.mock('../models', () => {
  const lean = (v: unknown) => ({ lean: async () => v });
  return {
    WaBusiness: { find: () => lean([{ slug: 'lerato', name: "Lerato's", phoneNumberId: 'p1' }]) },
    WaService: { findById: () => lean(svc) },
    WaAppointment: { find: () => lean([appt]), updateOne: (...a: unknown[]) => updateOne(...a) },
    WaClient: { findById: () => lean({ phone: '27821234567', name: 'Lindiwe Dlamini', optedOut: false, lastInboundAt: null }) },
  };
});

import { runReminders } from './reminders';

// The appointment is Saturday 7 Nov at 10:00 in Johannesburg. The reminder is Friday 18:00 there (16:00 UTC), so 16:30 UTC is just after it.
const NOW = new Date('2026-11-06T16:30:00Z');

describe('runReminders', () => {
  beforeEach(() => { sendRaw.mockReset(); updateOne.mockReset(); svc.hideName = false; });

  it('does nothing before 18:00 the evening before', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    sendRaw.mockResolvedValue(true);
    const r = await runReminders(new Date('2026-11-06T15:30:00Z'));
    expect(r.checked).toBe(0);
    expect(sendRaw).not.toHaveBeenCalled();
  });

  it('names the practitioner and never the service for a clinic visit', async () => {
    svc.hideName = true;
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    sendRaw.mockResolvedValue(true);
    await runReminders(NOW);
    const tpl = (sendRaw.mock.calls[0][1] as { template: { name: string; components: { parameters: { text: string }[] }[] } }).template;
    expect(tpl.name).toBe('remind_clinic');
    expect(tpl.components[0].parameters.map((p) => p.text)).toEqual(['Lindiwe', 'Lerato', 'Saturday 7 Nov', '10:00']);
    expect(JSON.stringify(sendRaw.mock.calls[0][1])).not.toContain('Silk press');
  });

  it('sends nothing when another run has already claimed the reminder', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 0 });
    sendRaw.mockResolvedValue(true);
    const r = await runReminders(NOW);
    expect(sendRaw).not.toHaveBeenCalled();
    expect(r.sent).toBe(0);
  });

  it('claims before sending, and sends the four template values the set-up guide asks for', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    sendRaw.mockResolvedValue(true);
    const r = await runReminders(NOW);
    expect(r.sent).toBe(1);
    expect(updateOne.mock.calls[0][1]).toHaveProperty('$push');
    const body = (sendRaw.mock.calls[0][1] as { template: { components: { type: string; parameters: unknown[] }[] } }).template.components[0];
    expect(body.parameters).toHaveLength(4);
  });

  it('gives the claim back when the send fails, so the next run tries again', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    sendRaw.mockResolvedValue(false);
    const r = await runReminders(NOW);
    expect(r.sent).toBe(0);
    expect(updateOne.mock.calls[1][1]).toMatchObject({ $pull: { reminders: { kind: 'day-before' } }, $set: { reminderFailedAt: expect.any(Date) } }); // and the calendar can say the reminder failed
  });
});
