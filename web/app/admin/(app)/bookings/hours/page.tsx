import type { Metadata } from 'next';
import HoursView from '@/components/booking-admin/HoursView';
import { loadHours } from '@/lib/server/whatsapp/admin';

export const metadata: Metadata = { title: 'Staff & hours · Booking assistant' };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <HoursView data={await loadHours()} initialTab={tab} />;
}
