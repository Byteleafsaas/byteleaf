// What the booking assistant sends and receives, independent of any one chat provider.
// The conversation logic builds these, the WhatsApp adapter turns them into API calls, and the demo
// simulator draws them directly. Keeping them plain data makes every message testable.

export type Button = { id: string; title: string };
export type Row = { id: string; title: string; description?: string };

export type OutText = { type: 'text'; body: string };
export type OutButtons = { type: 'buttons'; body: string; buttons: Button[] };
export type OutList = { type: 'list'; body: string; button: string; rows: Row[] };
export type Out = OutText | OutButtons | OutList;

/** What the customer did: typed something, or tapped a button or list row. */
export type Input = { type: 'text'; text: string } | { type: 'reply'; id: string; title?: string };

// WhatsApp's limits for interactive messages. Anything over them is rejected by WhatsApp, so we check before sending.
export const LIMITS = { body: 1024, buttons: 3, buttonTitle: 20, listRows: 10, rowTitle: 24, rowDescription: 72, listButton: 20 } as const;

/** Problems that would make WhatsApp reject a message. Empty when it is fine. */
export function validateOut(m: Out): string[] {
  const p: string[] = [];
  if (!m.body.trim()) p.push('The message has no text.');
  if (m.body.length > LIMITS.body) p.push(`The text is ${m.body.length} characters; the limit is ${LIMITS.body}.`);
  if (m.type === 'buttons') {
    if (m.buttons.length < 1 || m.buttons.length > LIMITS.buttons) p.push(`A message needs 1 to ${LIMITS.buttons} buttons, not ${m.buttons.length}.`);
    for (const b of m.buttons) if (b.title.length > LIMITS.buttonTitle) p.push(`Button "${b.title}" is ${b.title.length} characters; the limit is ${LIMITS.buttonTitle}.`);
    if (new Set(m.buttons.map((b) => b.id)).size !== m.buttons.length) p.push('Two buttons share an id.');
  }
  if (m.type === 'list') {
    if (m.rows.length < 1 || m.rows.length > LIMITS.listRows) p.push(`A list needs 1 to ${LIMITS.listRows} rows, not ${m.rows.length}.`);
    if (m.button.length > LIMITS.listButton) p.push(`The list button "${m.button}" is over ${LIMITS.listButton} characters.`);
    for (const r of m.rows) {
      if (r.title.length > LIMITS.rowTitle) p.push(`Row "${r.title}" is ${r.title.length} characters; the limit is ${LIMITS.rowTitle}.`);
      if ((r.description?.length ?? 0) > LIMITS.rowDescription) p.push(`The description of "${r.title}" is over ${LIMITS.rowDescription} characters.`);
    }
    if (new Set(m.rows.map((r) => r.id)).size !== m.rows.length) p.push('Two rows share an id.');
  }
  return p;
}
