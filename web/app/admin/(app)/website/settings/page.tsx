import type { Metadata } from 'next';
import SettingsAdmin from '@/components/website-admin/SettingsAdmin';
import { loadWebsite } from '@/lib/server/launch/admin';

export const metadata: Metadata = { title: 'Site settings · Website' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const { state, publish } = await loadWebsite();
  return <SettingsAdmin settings={state.saved.settings} live={state.live.settings} publish={publish} />;
}
