import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/server/auth';
import { DRAFT_COOKIE } from '@/lib/server/launch/store';
import { PAGES, type PageKey } from '@/lib/launch/types';
import { SAMPLE_BASE } from '@/lib/launch/site';

export const runtime = 'nodejs';

// Opens the sample site showing the owner's saved (unpublished) changes. Only a signed-in admin gets the cookie that switches it on.
export async function GET(req: Request, { params }: { params: Promise<{ page: string }> }) {
  if (!(await getAdmin())) return NextResponse.redirect(new URL('/admin/login', req.url));
  const { page } = await params;
  const path = page === 'home' ? '' : PAGES.includes(page as PageKey) ? `/${page}` : '';
  const res = NextResponse.redirect(new URL(`${SAMPLE_BASE}${path}`, req.url));
  res.cookies.set(DRAFT_COOKIE, '1', { path: SAMPLE_BASE, maxAge: 900, sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  return res;
}
