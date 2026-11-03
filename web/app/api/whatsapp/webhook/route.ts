import { NextResponse } from 'next/server';
import { parseWebhook, verifySignature } from '@/lib/whatsapp/cloud';
import { connectDB } from '@/lib/server/db';
import { env, isProd } from '@/lib/server/env';
import { WaBusiness, WaSeen } from '@/lib/server/models';
import { handleInbound } from '@/lib/server/whatsapp/inbound';
import { sendOut } from '@/lib/server/whatsapp/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STEER = "I can only read typed messages and button taps. Please tap one of the options, or type MENU to start again.";

/** Meta calls this once, when the webhook is set up, to check we own it. */
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (env.WHATSAPP_VERIFY_TOKEN && q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(q.get('hub.challenge') ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

/** Every customer message arrives here. We answer 200 quickly so Meta doesn't send it again. */
export async function POST(req: Request) {
  const raw = await req.text();

  // In production the signature must be checked. Without the app secret we refuse everything rather than trust the sender.
  if (env.WHATSAPP_APP_SECRET) {
    if (!verifySignature(raw, req.headers.get('x-hub-signature-256'), env.WHATSAPP_APP_SECRET)) return new NextResponse('Bad signature', { status: 401 });
  } else if (isProd) {
    return new NextResponse('WhatsApp is not set up on this server.', { status: 503 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse('Bad request', { status: 400 });
  }

  await connectDB();
  for (const m of parseWebhook(body)) {
    try {
      // Meta repeats a webhook when it doesn't hear back in time. Handle each message once.
      const fresh = await WaSeen.create({ messageId: m.messageId }).then(() => true, (e) => ((e as { code?: number }).code === 11000 ? false : Promise.reject(e)));
      if (!fresh) continue;
      const biz = await WaBusiness.findOne({ phoneNumberId: m.phoneNumberId, active: true }).lean();
      if (!biz) continue;
      const replies = m.input
        ? (await handleInbound({ slug: biz.slug, phone: m.from, name: m.name, input: m.input, source: 'whatsapp' })).messages
        : [{ type: 'text' as const, body: STEER }];
      if (replies.length) await sendOut(m.phoneNumberId, m.from, replies);
    } catch (e) {
      console.error('[whatsapp] could not handle a message:', (e as Error).message);
    }
  }
  return NextResponse.json({ ok: true });
}
