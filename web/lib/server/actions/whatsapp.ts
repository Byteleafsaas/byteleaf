'use server';

import { z } from 'zod';
import type { Out } from '@/lib/whatsapp/types';
import { clientInfo, rateLimit } from '../auth';
import { handleInbound } from '../whatsapp/inbound';

// The demo business is fictional and open to everyone, so the simulator only ever talks to it.
const DEMO = 'lerato';

const schema = z.object({
  /** A random id the browser keeps for the visit, standing in for a phone number. */
  session: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/),
  input: z.discriminatedUnion('type', [
    z.object({ type: z.literal('text'), text: z.string().trim().min(1).max(500) }),
    z.object({ type: z.literal('reply'), id: z.string().min(1).max(256), title: z.string().max(60).optional() }),
  ]),
});

/** One message from someone trying the booking assistant on the website. The same engine as real WhatsApp. */
export async function simulateWhatsAppAction(input: z.input<typeof schema>): Promise<{ ok: true; messages: Out[] } | { ok: false; error: string }> {
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, error: 'That message could not be read.' };
  const { ip } = await clientInfo();
  if (!(await rateLimit(`wa-sim:${ip}`, 60, 10 * 60000))) return { ok: false, error: 'You have sent a lot of messages in a short time. Please wait a few minutes and try again.' };
  // A made-up number per visit: letters become digits so it fits the phone-number format.
  const phone = `99${[...p.data.session].map((c) => c.charCodeAt(0) % 10).join('')}`.slice(0, 14);
  try {
    const r = await handleInbound({ slug: DEMO, phone, name: 'You', input: p.data.input, source: 'simulator' });
    return r.unknownBusiness ? { ok: false, error: 'The demo business is not set up yet.' } : { ok: true, messages: r.messages };
  } catch (e) {
    console.error('[whatsapp] simulator failed:', (e as Error).message);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
