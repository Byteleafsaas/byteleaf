import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/server/auth';
import { ImageError, processImage } from '@/lib/server/images';
import { putObject } from '@/lib/server/storage';

export const runtime = 'nodejs';
const MAX = 10 * 1024 * 1024;

// Admin-only photo upload for the sample site. Photos can be up to 10 MB; the file is checked by its real bytes, turned the
// right way up, stripped of location data and scaled down, exactly like project images.
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  if (Number(req.headers.get('content-length') ?? 0) > MAX + 200_000) return NextResponse.json({ error: 'Too big. Photos can be up to 10 MB.' }, { status: 413 });
  const file = (await req.formData()).get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX) return NextResponse.json({ error: `Too big (${(buf.length / 1048576).toFixed(1)} MB). Photos can be up to 10 MB.` }, { status: 413 });
  try {
    const img = await processImage(buf, 'projects', MAX);
    await putObject(img.key, img.body, img.contentType);
    return NextResponse.json({ key: img.key, width: img.width, height: img.height });
  } catch (e) {
    if (e instanceof ImageError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[site upload]', e);
    return NextResponse.json({ error: 'The upload failed. Please try again.' }, { status: 500 });
  }
}
