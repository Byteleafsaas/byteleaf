import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('../db', () => ({ connectDB: async () => {} }));
vi.mock('../env', () => ({ env: { WHATSAPP_REMINDER_TEMPLATE: 'remind', WHATSAPP_TEMPLATE_LANG: 'en' } }));
const sendRaw = vi.fn();
vi.mock('./send', () => ({ sendOut: vi.fn(), sendRaw: (...a: unknown[]) => sendRaw(...a) }));
vi.mock('./calendar', () => ({ releaseOrphanLocks: async () => 0 }));

const appt = { _id: 'a1', clientId: 'c1', serviceName: 'Silk press', date: '2026-11-07', time: '10:00', startsAt: new Date('2026-11-07T08:00:00Z'), createdAt: new Date('2026-11-01T08:00:00Z'), reminders: [] as { kind: string }[] };
const updateOne = vi.fn();
vi.mock('../models', () => {
  const lean = (v: unknown) => ({ lean: async () => v });
  return {
    WaBusiness: { find: () => lean([{ slug: 'lerato', name: "Lerato's", phoneNumberId: 'p1', reminderHours: [24] }]) },
    WaAppointment: { find: () => lean([appt]), updateOne: (...a: unknown[]) => updateOne(...a) },
    WaClient: { findById: () => lean({ phone: '27821234567', name: 'Lindiwe Dlamini', optedOut: false, lastInboundAt: null }) },
  };
});

import { runReminders } from './reminders';

const NOW = new Date('2026-11-06T09:00:00Z'); // 23 h before the appointment

describe('runReminders', () => {
  beforeEach(() => { sendRaw.mockReset(); updateOne.mockReset(); });

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
    expect(updateOne.mock.calls[1][1]).toMatchObject({ $pull: { reminders: { kind: '24h' } }, $set: { reminderFailedAt: expect.any(Date) } }); // and the calendar can say the reminder failed
  });
});
