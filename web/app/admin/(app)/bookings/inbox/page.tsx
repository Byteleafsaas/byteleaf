import type { Metadata } from 'next';
import InboxView from '@/components/booking-admin/InboxView';
import { loadInbox } from '@/lib/server/whatsapp/inbox';

export const metadata: Metadata = { title: 'Inbox · Booking assistant' };
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ chat?: string }> }) {
  const { chat } = await searchParams;
  const selected = chat && /^[a-f0-9]{24}$/.test(chat) ? chat : '';
  const data = await loadInbox(selected);
  return <InboxView data={data} selected={data.open ? selected : ''} />;
}
