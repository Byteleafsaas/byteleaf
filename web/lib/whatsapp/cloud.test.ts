import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseWebhook, templatePayload, toCloudPayload, verifySignature, windowOpen } from './cloud';

const sign = (body: string, secret: string) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('verifySignature', () => {
  const body = '{"entry":[]}';
  it('accepts the signature made with the app secret', () => {
    expect(verifySignature(body, sign(body, 's3cret'), 's3cret')).toBe(true);
  });
  it('rejects a wrong secret, a changed body, a missing header and an unset secret', () => {
    expect(verifySignature(body, sign(body, 'other'), 's3cret')).toBe(false);
    expect(verifySignature(`${body} `, sign(body, 's3cret'), 's3cret')).toBe(false);
    expect(verifySignature(body, null, 's3cret')).toBe(false);
    expect(verifySignature(body, sign(body, ''), '')).toBe(false);
    expect(verifySignature(body, 'sha256=short', 's3cret')).toBe(false);
  });
});

const hook = (messages: unknown[], extra: Record<string, unknown> = {}) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: '1', changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'PN1' }, contacts: [{ wa_id: '27821234567', profile: { name: 'Lindiwe' } }], messages, ...extra } }] }],
});

describe('parseWebhook', () => {
  it('reads typed text with the customer name', () => {
    const r = parseWebhook(hook([{ id: 'm1', from: '27821234567', type: 'text', text: { body: 'Hi' } }]));
    expect(r).toEqual([{ phoneNumberId: 'PN1', from: '27821234567', name: 'Lindiwe', messageId: 'm1', input: { type: 'text', text: 'Hi' } }]);
  });
  it('reads a button tap and a list pick', () => {
    const r = parseWebhook(hook([
      { id: 'm2', from: '27821234567', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'ok', title: 'Confirm' } } },
      { id: 'm3', from: '27821234567', type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'svc:1', title: 'Silk press' } } },
    ]));
    expect(r.map((x) => x.input)).toEqual([{ type: 'reply', id: 'ok', title: 'Confirm' }, { type: 'reply', id: 'svc:1', title: 'Silk press' }]);
  });
  it('reads a quick-reply tap on a reminder template', () => {
    const r = parseWebhook(hook([{ id: 'm4', from: '27821234567', type: 'button', button: { payload: 'remind:ok', text: 'Yes, see you' } }]));
    expect(r[0].input).toEqual({ type: 'reply', id: 'remind:ok', title: 'Yes, see you' });
  });
  it('passes a voice note, photo or sticker on as media so the assistant can steer the customer back', () => {
    const r = parseWebhook(hook([{ id: 'm5', from: '27821234567', type: 'audio', audio: { id: 'a' } }]));
    expect(r).toHaveLength(1);
    expect(r[0].input).toEqual({ type: 'media', kind: 'audio' });
  });
  it('marks message types we know nothing about with no input', () => {
    const r = parseWebhook(hook([{ id: 'm6', from: '27821234567', type: 'order' }]));
    expect(r[0].input).toBeNull();
  });
  it('ignores delivery receipts and malformed payloads', () => {
    expect(parseWebhook(hook([], { statuses: [{ id: 'x', status: 'delivered' }] }))).toEqual([]);
    expect(parseWebhook({})).toEqual([]);
    expect(parseWebhook(null)).toEqual([]);
    expect(parseWebhook({ entry: [{ changes: [{ value: { messages: [{ id: 'm', from: '1', type: 'text', text: { body: 'x' } }] } }] }] })).toEqual([]); // no phone number id
  });
});

describe('toCloudPayload', () => {
  it('builds text, button and list messages', () => {
    expect(toCloudPayload({ type: 'text', body: 'Hello' }, '27')).toMatchObject({ type: 'text', to: '27', text: { body: 'Hello' } });
    expect(toCloudPayload({ type: 'buttons', body: 'Pick', buttons: [{ id: 'a', title: 'A' }] }, '27')).toMatchObject({ type: 'interactive', interactive: { type: 'button', action: { buttons: [{ type: 'reply', reply: { id: 'a', title: 'A' } }] } } });
    const list = toCloudPayload({ type: 'list', body: 'Pick', button: 'Choose', rows: [{ id: 'r1', title: 'One', description: 'First' }, { id: 'r2', title: 'Two' }] }, '27') as { interactive: { action: { button: string; sections: { rows: object[] }[] } } };
    expect(list.interactive.action.button).toBe('Choose');
    expect(list.interactive.action.sections[0].rows).toEqual([{ id: 'r1', title: 'One', description: 'First' }, { id: 'r2', title: 'Two' }]);
  });
  it('builds a template with body values and quick-reply payloads', () => {
    const p = templatePayload('27', 'booking_reminder', 'en', ['Lindiwe', 'Sat 8 Nov', '08:00'], ['remind:ok', 'remind:move:abc']) as { template: { components: { type: string; parameters: unknown[] }[] } };
    expect(p.template.components[0].parameters).toHaveLength(3);
    expect(p.template.components[2]).toMatchObject({ type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'remind:move:abc' }] });
  });
});

describe('windowOpen', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  it('is open within 24 hours of the last message from the customer', () => {
    expect(windowOpen(new Date('2026-11-05T13:00:00Z'), now)).toBe(true);
    expect(windowOpen(new Date('2026-11-05T11:00:00Z'), now)).toBe(false);
    expect(windowOpen(null, now)).toBe(false);
  });
});
