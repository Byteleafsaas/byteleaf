import type { Metadata } from 'next';
import ServicesAdmin from '@/components/website-admin/ServicesAdmin';
import { loadWebsite } from '@/lib/server/launch/admin';

export const metadata: Metadata = { title: 'Services & prices · Website' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const { state, publish } = await loadWebsite();
  return <ServicesAdmin services={state.saved.services} live={state.live.services} publish={publish} />;
}
