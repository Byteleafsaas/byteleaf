import { NextResponse } from 'next/server';
import { isWorkspaceId } from '@/lib/assistant/workspaces';
import { ingest } from '@/lib/server/assistant/ingest';
import { MAX_FILE_BYTES } from '@/lib/server/assistant/extract';
import { getAdmin } from '@/lib/server/auth';
import { connectDB } from '@/lib/server/db';
import { KnowledgeSource } from '@/lib/server/models';

export const runtime = 'nodejs';

// Receives files for the knowledge assistant, creates one source per file and reads each in the background.
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: 'Please sign in again.' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const ws = String(form?.get('workspace') ?? '');
  const files = (form?.getAll('file') ?? []).filter((f): f is File => f instanceof File && f.size > 0).slice(0, 5);
  if (!form || !isWorkspaceId(ws) || !files.length) return NextResponse.json({ ok: false, error: 'Choose a file to upload.' }, { status: 400 });
  const staffOnly = form.get('staffOnly') === 'true';

  await connectDB();
  const ids: string[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ ok: false, error: `${file.name} is over 10 MB. Split it up or paste the text instead.` }, { status: 413 });
    const src = await KnowledgeSource.create({
      workspace: ws, name: file.name, type: 'file', detail: file.name, state: 'processing', progress: { stage: 'read', done: 0, total: 0 }, staffOnly, createdBy: admin.name,
    });
    ids.push(String(src._id));
    void ingest(String(src._id), ws, { kind: 'file', buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, mime: file.type });
  }
  return NextResponse.json({ ok: true, ids });
}
