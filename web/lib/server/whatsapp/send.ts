import 'server-only';
import { toCloudPayload } from '@/lib/whatsapp/cloud';
import type { Out } from '@/lib/whatsapp/types';
import { env } from '../env';

export const whatsappConfigured = () => Boolean(env.WHATSAPP_TOKEN);

/** Sends one prepared request to the WhatsApp Cloud API. Returns false (and logs why) on any failure. */
export async function sendRaw(phoneNumberId: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!env.WHATSAPP_TOKEN) {
    console.warn('[whatsapp] WHATSAPP_TOKEN is not set, so nothing was sent.');
    return false;
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[whatsapp] send failed', res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[whatsapp] send failed:', (e as Error).message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Sends our replies to a customer, in order. Stops at the first one that fails so they don't arrive out of order. */
export async function sendOut(phoneNumberId: string, to: string, messages: Out[]): Promise<boolean> {
  for (const m of messages) {
    if (!(await sendRaw(phoneNumberId, toCloudPayload(m, to)))) return false;
  }
  return true;
}
