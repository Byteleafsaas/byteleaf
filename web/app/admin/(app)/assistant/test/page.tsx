import type { Metadata } from 'next';
import TestView from '@/components/assistant-admin/TestView';
import { connectDB } from '@/lib/server/db';
import { KnowledgeItem } from '@/lib/server/models';

export const metadata: Metadata = { title: 'Test assistant' };

export default async function Page() {
  await connectDB();
  return <TestView liveCount={await KnowledgeItem.countDocuments({ workspace: 'khumalo', status: 'live', staffOnly: false })} />;
}
