import type { Metadata } from 'next';
import SourcesView from '@/components/assistant-admin/SourcesView';
import { loadAssistantCounts, loadSources } from '@/lib/server/assistant/admin';

export const metadata: Metadata = { title: 'Knowledge sources' };

export default async function Page() {
  const [rows, counts] = await Promise.all([loadSources('khumalo'), loadAssistantCounts('khumalo')]);
  return <SourcesView initial={rows} waiting={counts.review} />;
}
