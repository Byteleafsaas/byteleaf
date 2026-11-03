// The WhatsApp Business Cloud API, as pure functions: check that a webhook really came from Meta, read what it says,
// and turn our messages into the shapes the API expects. No network here, so all of it can be tested.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Input, Out } from './types';

/** True when `signature` ("sha256=...") is the HMAC of the exact raw body, made with the app secret. */
export function verifySignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature || !signature.startsWith('sha256=') || !appSecret) return false;
  const want = Buffer.from(createHmac('sha256', appSecret).update(rawBody).digest('hex'));
  const got = Buffer.from(signature.slice(7));
  return want.length === got.length && timingSafeEqual(want, got);
}

export type Inbound = { phoneNumberId: string; from: string; name?: string; messageId: string; input: Input | null };

type Msg = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  interactive?: { type?: string; button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
  button?: { payload?: string; text?: string };
};
type Payload = { entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; contacts?: { wa_id?: string; profile?: { name?: string } }[]; messages?: Msg[] } }[] }[] };

/**
 * Everything a customer sent in one webhook call. Taps and typed text become an Input.
 * Anything we can't act on (a photo, a voice note, a sticker) comes back with `input: null` so the caller can steer them back.
 * Delivery receipts and other events are not messages and are skipped.
 */
export function parseWebhook(body: unknown): Inbound[] {
  const out: Inbound[] = [];
  for (const entry of (body as Payload)?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      const phoneNumberId = v?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      for (const m of v?.messages ?? []) {
        if (!m.id || !m.from) continue;
        const name = v?.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
        let input: Input | null = null;
        if (m.type === 'text' && m.text?.body) input = { type: 'text', text: m.text.body };
        else if (m.type === 'interactive') {
          const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
          if (r?.id) input = { type: 'reply', id: r.id, title: r.title };
        } else if (m.type === 'button' && m.button?.payload) input = { type: 'reply', id: m.button.payload, title: m.button.text };
        out.push({ phoneNumberId, from: m.from, name, messageId: m.id, input });
      }
    }
  }
  return out;
}

/** The request body for sending one of our messages to a customer. */
export function toCloudPayload(m: Out, to: string): Record<string, unknown> {
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };
  if (m.type === 'text') return { ...base, type: 'text', text: { preview_url: false, body: m.body } };
  if (m.type === 'buttons') {
    return { ...base, type: 'interactive', interactive: { type: 'button', body: { text: m.body }, action: { buttons: m.buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })) } } };
  }
  return {
    ...base, type: 'interactive',
    interactive: { type: 'list', body: { text: m.body }, action: { button: m.button, sections: [{ title: 'Options', rows: m.rows.map((r) => ({ id: r.id, title: r.title, ...(r.description ? { description: r.description } : {}) })) }] } },
  };
}

/** A pre-approved template message with quick-reply buttons, used for reminders outside the 24-hour window. */
export function templatePayload(to: string, name: string, language: string, params: string[], buttonPayloads: string[] = []): Record<string, unknown> {
  return {
    messaging_product: 'whatsapp', to, type: 'template',
    template: {
      name, language: { code: language },
      components: [
        { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
        ...buttonPayloads.map((payload, index) => ({ type: 'button', sub_type: 'quick_reply', index: String(index), parameters: [{ type: 'payload', payload }] })),
      ],
    },
  };
}

/** WhatsApp lets a business send free-form messages only within 24 hours of the customer's last message. */
export const windowOpen = (lastInboundAt: Date | null | undefined, now: Date) => Boolean(lastInboundAt) && now.getTime() - lastInboundAt!.getTime() < 24 * 3600000;
