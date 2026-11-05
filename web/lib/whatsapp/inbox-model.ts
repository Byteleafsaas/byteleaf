// What the owner's inbox shows, as pure functions: whose message it is, how long the reply window stays open, what the
// chat's status strip says. No database, so the rules from the design handoff (§2, question 3 and 4) can be tested.

export type From = 'client' | 'assistant' | 'staff';
export type ChatStatus = 'assistant' | 'asked' | 'taken';

const DAY = 24 * 3600000;

/** WhatsApp lets us send free-form messages only within 24 hours of the client's last message. */
export function windowState(lastInboundAt: Date | null | undefined, now: Date): { open: boolean; hoursLeft: number; label: string } {
  if (!lastInboundAt) return { open: false, hoursLeft: 0, label: 'Window closed · you can send a template' };
  const left = DAY - (now.getTime() - lastInboundAt.getTime());
  if (left <= 0) return { open: false, hoursLeft: 0, label: 'Window closed · you can send a template' };
  const h = Math.max(1, Math.ceil(left / 3600000));
  return { open: true, hoursLeft: h, label: `REPLY WINDOW · ${h} H LEFT` };
}

/** Who the chat is with right now. A person has it once they take over; a request for one flags it first. */
export function chatStatus(state: { step?: string } | null | undefined, needsHuman: boolean): ChatStatus {
  if (state?.step === 'handover') return needsHuman ? 'asked' : 'taken';
  return 'assistant';
}

export const STATUS_STRIP: Record<ChatStatus, { text: string; bg: string; fg: string }> = {
  assistant: { text: 'Assistant is answering', bg: '#F4F7FB', fg: '#33405A' },
  asked: { text: 'asked for a person · assistant paused', bg: '#FEF3F2', fg: '#912018' },
  taken: { text: 'You’re replying · assistant paused', bg: '#F7ECF5', fg: '#5E1F55' },
};

/** The label above a message: Assistant, You (name), or the client's own name. */
export function whoLabel(m: { from?: From | null; by?: string | null; dir?: string | null }, client: string): string {
  const from = m.from ?? (m.dir === 'in' ? 'client' : 'assistant');
  return from === 'client' ? client : from === 'staff' ? `You${m.by ? ` (${m.by})` : ''}` : 'Assistant';
}

/** The reply box only works while a person has the chat and the window is open. */
export function canReply(status: ChatStatus, windowOpen: boolean): boolean {
  return status === 'taken' && windowOpen;
}

/** A short preview for the chat list. */
export const preview = (body: string, max = 60) => (body.length > max ? `${body.slice(0, max - 1).trimEnd()}…` : body).replace(/\s+/g, ' ');
