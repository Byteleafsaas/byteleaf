import type { Metadata } from 'next';
import PhotosAdmin from '@/components/website-admin/PhotosAdmin';
import { loadWebsite } from '@/lib/server/launch/admin';

export const metadata: Metadata = { title: 'Photos · Website' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const { state, publish } = await loadWebsite();
  return <PhotosAdmin photos={state.saved.photos} siteName={state.live.settings.name} publish={publish} />;
}
