import type { Metadata } from 'next';
import SettingsView from '@/components/assistant-admin/SettingsView';
import { getAssistantSettings } from '@/lib/server/assistant/settings';

export const metadata: Metadata = { title: 'Assistant settings' };

export default async function Page() {
  return <SettingsView initial={await getAssistantSettings('khumalo')} />;
}
