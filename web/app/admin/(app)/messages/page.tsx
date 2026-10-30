import type { Metadata } from 'next';
import MessagesView from './MessagesView';

export const metadata: Metadata = { title: 'Messages' };

export default function Page() {
  return <MessagesView />;
}
