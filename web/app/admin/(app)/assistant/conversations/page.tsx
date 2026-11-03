import type { Metadata } from 'next';
import ConversationsView from '@/components/assistant-admin/ConversationsView';
import { loadConversations } from '@/lib/server/assistant/conversations';

export const metadata: Metadata = { title: 'Conversations' };

export default async function Page() {
  return <ConversationsView initial={await loadConversations('khumalo', 7)} />;
}
