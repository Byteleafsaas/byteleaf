import type { Metadata } from 'next';
import BillingList from './BillingList';

export const metadata: Metadata = { title: 'Quotes & invoices' };

export default function Page() {
  return <BillingList />;
}
