import 'server-only';
import { unstable_cache } from 'next/cache';
import { SEED_SETTINGS } from '@/lib/admin/mock';
import type { Settings } from '@/lib/admin/types';
import { connectDB } from './db';
import { toSettings } from './mappers';
import { AdminUser, SettingsModel } from './models';

export const SETTINGS_TAG = 'settings';

/** Defaults used the first time the single Settings document is created (no demo data: blanks stay blank). */
function defaultDoc() {
  const s = SEED_SETTINGS;
  return {
    key: 'site',
    business: { ...s.business },
    prices: { care: { ...s.prices.care }, build: { ...s.prices.build }, fix: { ...s.prices.fix }, team: { ...s.prices.team }, includedHours: '' },
    availability: { ...s.availability, workingDays: [...s.availability.workingDays], startTimes: [...s.availability.startTimes], meetingTypes: s.availability.meetingTypes.map((m) => ({ ...m })), blocked: [] },
    invoicing: { ...s.invoicing, bank: { ...s.invoicing.bank } },
  };
}

export async function getSettingsDoc() {
  await connectDB();
  const existing = await SettingsModel.findOne({ key: 'site' });
  if (existing) return existing;
  // Atomic upsert so two concurrent first requests don't create two documents.
  await SettingsModel.updateOne({ key: 'site' }, { $setOnInsert: defaultDoc() }, { upsert: true });
  return (await SettingsModel.findOne({ key: 'site' }))!;
}

/** Full settings for the admin (includes the signed-in user's account block). */
export async function getAdminSettings(userId: string): Promise<Settings> {
  const [doc, user] = await Promise.all([getSettingsDoc(), AdminUser.findById(userId).lean()]);
  return toSettings(doc.toObject(), { name: user?.name ?? '', email: user?.email ?? '', twoStep: !!user?.twoStepEnabled });
}

/** Public-safe subset, cached and revalidated when an admin saves settings. */
export const getPublicSettings = unstable_cache(
  async () => {
    const doc = await getSettingsDoc();
    const s = toSettings(doc.toObject(), { name: '', email: '', twoStep: false });
    return { business: s.business, prices: s.prices, availability: s.availability };
  },
  ['public-settings'],
  { tags: [SETTINGS_TAG], revalidate: 300 },
);
export type PublicSettings = Awaited<ReturnType<typeof getPublicSettings>>;
