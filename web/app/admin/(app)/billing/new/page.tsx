import type { Metadata } from 'next';
import DocumentEditor from '../DocumentEditor';

export const metadata: Metadata = { title: 'New quote or invoice' };

export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  return <DocumentEditor initialKind={type === 'invoice' ? 'invoice' : 'quote'} />;
}
