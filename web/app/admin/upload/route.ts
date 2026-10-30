import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/server/auth';
import { ImageError, MAX_IMAGE_BYTES, processImage } from '@/lib/server/images';
import { putObject } from '@/lib/server/storage';

export const runtime = 'nodejs';

// Admin-only image upload. Returns the stored key plus dimensions; the project form saves the key.
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  // CSRF: this is a cookie-authenticated POST route, so require a same-origin request.
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_IMAGE_BYTES + 100_000) return NextResponse.json({ error: 'Images must be 5 MB or smaller.' }, { status: 413 });

  const file = (await req.formData()).get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  try {
    const img = await processImage(Buffer.from(await file.arrayBuffer()));
    await putObject(img.key, img.body, img.contentType);
    return NextResponse.json({ key: img.key, width: img.width, height: img.height });
  } catch (e) {
    if (e instanceof ImageError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[upload]', e);
    return NextResponse.json({ error: 'The upload failed. Please try again.' }, { status: 500 });
  }
}
