import type { Metadata } from 'next';
import UnansweredView from '@/components/assistant-admin/UnansweredView';
import { loadUnanswered } from '@/lib/server/assistant/unanswered';

export const metadata: Metadata = { title: 'Unanswered questions' };

export default async function Page() {
  return <UnansweredView initial={await loadUnanswered('khumalo')} />;
}
