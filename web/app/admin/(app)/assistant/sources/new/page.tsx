import type { Metadata } from 'next';
import AddSourceView from '@/components/assistant-admin/AddSourceView';

export const metadata: Metadata = { title: 'Add a source' };

export default async function Page({ searchParams }: { searchParams: Promise<{ via?: string }> }) {
  const { via } = await searchParams;
  return <AddSourceView initialVia={via === 'upload' || via === 'type' ? via : 'website'} />;
}
