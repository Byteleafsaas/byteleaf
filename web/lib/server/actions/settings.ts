'use server';

import { z } from 'zod';
import { revalidatePath, revalidateTag } from 'next/cache';
import { assertAdmin } from '../auth';
import { connectDB } from '../db';
import { AdminUser, SettingsModel } from '../models';
import { getSettingsDoc, SETTINGS_TAG } from '../settings';

const email = z.string().trim().toLowerCase().email().or(z.literal(''));
const time = z.string().regex(/^\d{2}:\d{2}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const price = z.object({ text: z.string().trim().max(60), unit: z.string().max(40) });

const schema = z.object({
  business: z.object({
    publicEmail: email, phone: z.string().trim().max(40), location: z.string().trim().max(120), hours: z.string().trim().max(80),
    replyWithin: z.string().max(40), urgentResponse: z.string().max(40), notifyEmail: email,
  }),
  prices: z.object({ care: price, build: price, fix: price, team: price, includedHours: z.string().trim().max(10) }),
  availability: z.object({
    workingDays: z.array(z.number().int().min(1).max(7)).min(1, 'Pick at least one working day.'),
    startTimes: z.array(time).min(1, 'Add at least one start time.'),
    meetingTypes: z.array(z.object({ key: z.enum(['discovery', 'deep-dive', 'in-person']), name: z.string(), where: z.string(), enabled: z.boolean(), minutes: z.number().int().min(15).max(180) })),
    minNotice: z.string().max(40), bufferMin: z.string().max(20), maxPerDay: z.number().int().min(1).max(50),
    blocked: z.array(z.object({ from: date, to: date })),
  }),
  invoicing: z.object({
    legalName: z.string().trim().max(120), regNo: z.string().trim().max(40), address: z.string().trim().max(240),
    vatRegistered: z.boolean(), vatNumber: z.string().trim().max(30),
    bank: z.object({ name: z.string().trim().max(80), accountName: z.string().trim().max(80), accountNo: z.string().trim().max(30), branchCode: z.string().trim().max(20) }),
    nextQuoteNo: z.string().regex(/^Q-\d{4}-\d{3,}$/, 'Use the format Q-2026-001.'),
    nextInvoiceNo: z.string().regex(/^INV-\d{4}-\d{3,}$/, 'Use the format INV-2026-001.'),
    defaultTermsDays: z.string().max(20), quoteValidDays: z.string().max(20), defaultDepositPct: z.string().max(10), defaultInvoiceNotes: z.string().max(1000),
  }),
  account: z.object({ name: z.string().trim().min(1).max(80), email: email, twoStep: z.boolean() }),
});

export type SettingsInput = z.input<typeof schema>;

export async function saveSettingsAction(input: SettingsInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await assertAdmin();
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the highlighted fields.' };
  const s = p.data;
  if (s.invoicing.vatRegistered && !s.invoicing.vatNumber) return { ok: false, error: 'Add your VAT number to charge VAT.' };
  await connectDB();

  const doc = await getSettingsDoc();
  doc.set({ business: s.business, prices: s.prices, availability: s.availability, invoicing: s.invoicing });
  await doc.save();

  // Account fields (the signed-in admin). The sign-in email must stay unique.
  const user = await AdminUser.findById(admin.id);
  if (user) {
    user.name = s.account.name;
    if (s.account.email) {
      const taken = await AdminUser.exists({ email: s.account.email, _id: { $ne: user._id } });
      if (taken) return { ok: false, error: 'That sign-in email is already used by another admin.' };
      user.email = s.account.email;
    }
    // TODO(2FA): twoStepEnabled is only switched on after a TOTP enrolment flow (not designed yet).
    await user.save();
  }
  void SettingsModel;

  // Public pages read these values: revalidate them straight away.
  revalidateTag(SETTINGS_TAG);
  revalidatePath('/', 'layout');
  revalidatePath('/admin', 'layout');
  return { ok: true };
}
