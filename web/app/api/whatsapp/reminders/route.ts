import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { env } from '@/lib/server/env';
import { runReminders } from '@/lib/server/whatsapp/reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A scheduler calls this every few minutes with `Authorization: Bearer <CRON_SECRET>`. */
export async function POST(req: Request) {
  if (!env.CRON_SECRET) return new NextResponse('Not set up.', { status: 503 });
  const got = Buffer.from((req.headers.get('authorization') ?? '').replace(/^Bearer /, ''));
  const want = Buffer.from(env.CRON_SECRET);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return new NextResponse('Unauthorised', { status: 401 });
  return NextResponse.json(await runReminders());
}
