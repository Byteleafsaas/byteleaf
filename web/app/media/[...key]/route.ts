import { NextResponse } from 'next/server';
import { IMAGE_KEY } from '@/lib/server/images';
import { getObject } from '@/lib/server/storage';

export const runtime = 'nodejs';

// Public read access to project images. The bucket stays private; this route is the only way in, and it only serves keys
// that match the exact shape we generate. Filenames are unique per upload, so responses can be cached forever.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join('/');
  if (!IMAGE_KEY.test(key)) return new NextResponse('Not found', { status: 404 });
  const obj = await getObject(key);
  if (!obj) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(obj.body), {
    headers: { 'Content-Type': obj.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}
