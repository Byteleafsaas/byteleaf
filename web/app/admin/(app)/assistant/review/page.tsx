import type { Metadata } from 'next';
import ReviewView from '@/components/assistant-admin/ReviewView';
import { loadReviewItems } from '@/lib/server/assistant/review';

export const metadata: Metadata = { title: 'Review & publish' };

export default async function Page() {
  return <ReviewView initial={await loadReviewItems('khumalo')} />;
}
