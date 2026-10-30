import type { Metadata } from 'next';
import DocumentEditor from '../DocumentEditor';

export const metadata: Metadata = { title: 'Quote or invoice' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentEditor id={id} />;
}
