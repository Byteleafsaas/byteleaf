import type { Metadata } from 'next';
import ProjectEditor from '../ProjectEditor';

export const metadata: Metadata = { title: 'Edit project' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectEditor id={id} />;
}
