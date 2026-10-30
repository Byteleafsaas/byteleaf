import type { Metadata } from 'next';
import ProjectEditor from '../ProjectEditor';

export const metadata: Metadata = { title: 'Add project' };

export default function Page() {
  return <ProjectEditor />;
}
