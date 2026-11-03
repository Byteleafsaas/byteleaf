import { NextResponse } from 'next/server';
import { env } from '@/lib/server/env';
import { sessionFromLink, setStaffCookie } from '@/lib/server/assistant/staff';

// The one-time link from the sign-in email. A good link starts a session; anything else goes back to the gate with an error.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  const session = sessionFromLink(token);
  const to = (q = '') => NextResponse.redirect(new URL(`/projects/knowledge-chatbot/staff${q}`, env.APP_URL));
  if (!session) return to('?error=expired');
  await setStaffCookie(session);
  return to();
}
