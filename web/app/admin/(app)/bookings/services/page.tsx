import type { Metadata } from 'next';
import ServicesView from '@/components/booking-admin/ServicesView';
import { loadServices } from '@/lib/server/whatsapp/admin';

export const metadata: Metadata = { title: 'Services · Booking assistant' };

export default async function Page() {
  const { services, staff } = await loadServices();
  return <ServicesView initial={services} staff={staff} />;
}
