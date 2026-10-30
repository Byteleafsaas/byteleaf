import { NextResponse, type NextRequest } from 'next/server';

// Edge gate: every /admin/* route except the three auth pages needs a session cookie.
// The cookie is only checked for presence here (the Edge runtime has no database access);
// the layout and every Server Action validate it against the database.
const PUBLIC_ADMIN = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_ADMIN.includes(pathname)) return NextResponse.next();
  if (!req.cookies.get('bl_session')?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
