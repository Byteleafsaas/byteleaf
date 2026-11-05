import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PagesAdmin from '@/components/website-admin/PagesAdmin';
import { PAGES, type PageKey } from '@/lib/launch/types';
import { loadWebsite } from '@/lib/server/launch/admin';

export const metadata: Metadata = { title: 'Pages · Website' };
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!PAGES.includes(page as PageKey)) notFound();
  const { state, publish } = await loadWebsite();
  return <PagesAdmin key={page} initial={page as PageKey} pages={state.saved.pages} photos={state.saved.photos} areas={state.saved.settings.areas} publish={publish} />;
}
