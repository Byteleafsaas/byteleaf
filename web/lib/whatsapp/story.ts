// The guided demo on /projects/whatsapp-booking: three short stories the visitor taps through, while the owner's side
// changes. All of it is data and pure functions, so the stories can be tested and the messages checked against WhatsApp's
// limits. Nothing here talks to a server: the wording comes from the design's message library (`whatsapp/messages.json`).
import type { Out } from './types';

export type FlowKey = 'book' | 'move' | 'person';
export const FLOWS: { key: FlowKey; n: string; label: string }[] = [
  { key: 'book', n: '1', label: 'Book an appointment' },
  { key: 'move', n: '2', label: 'Reschedule from a reminder' },
  { key: 'person', n: '3', label: 'Ask for a person' },
];

export type Msg = { me?: boolean; text: string; time: string; staff?: boolean; tpl?: boolean; btns?: string[]; list?: string; rows?: [string, string][]; foot?: string };
export type Owner = { held: boolean; booked: boolean; moved: boolean; flag: boolean; taken: boolean; sent: boolean; back: boolean; ntf: string };
export type Step = { bot: Omit<Msg, 'time' | 'me'>; /** What the visitor must tap next, or null at the end. 'owner:…' means the owner's side acts. */ expect: string | null; owner?: Partial<Owner> };

const P = 'Reply PERSON to talk to us';

export function script(flow: FlowKey): Step[] {
  if (flow === 'book') return [
    { bot: { text: "Hi! I'm the automated booking assistant for *Lerato's Braids & Beauty*. Which service would you like?", btns: ['Knotless braids', "Kids' braids", 'Other services'] }, expect: 'Knotless braids' },
    { bot: { text: '*Knotless braids* take about 4 hours and cost R 650.\n\nWhich day suits you?', list: 'See days', rows: [['Sat 7 Nov', 'Three times open'], ['Tue 10 Nov', 'Five times open'], ['Wed 11 Nov', 'Four times open'], ['Thu 12 Nov', 'Two times open'], ['Later dates', 'Show the week after']], foot: P }, expect: 'Sat 7 Nov' },
    { bot: { text: 'These times are open on *Saturday 7 November*. Tap one to choose.', list: 'See times', rows: [['08:00', 'Until 12:00 · with Lerato'], ['09:30', 'Until 13:30 · with Thandeka'], ['12:00', 'Until 16:00 · with Lerato'], ['Another day', 'Back to the list of days']], foot: P }, expect: '08:00', owner: { held: true } },
    { bot: { text: 'Please confirm your booking:\n\n*Knotless braids* with Lerato\nSaturday 7 Nov, 08:00 to 12:00\nR 650, paid at the salon', btns: ['Confirm', 'Change time', 'Cancel'], foot: P }, expect: 'Confirm', owner: { held: false, booked: true, ntf: 'New booking on WhatsApp · Lindiwe Dube, Knotless braids, Sat 7 Nov 08:00' } },
    { bot: { text: "You're booked, Lindiwe!\n\n*Knotless braids* with Lerato\nSaturday 7 Nov, 08:00 to 12:00\n[Salon address], Randburg\n\nWe'll remind you the day before. To change or cancel, just message us here." }, expect: null },
  ];
  if (flow === 'move') return [
    { bot: { tpl: true, text: "Hi Lindiwe, this is a reminder of your Knotless braids appointment at Lerato's Braids & Beauty tomorrow, Saturday 7 Nov, at 08:00.\n\nCan you still make it?", btns: ['Confirm', 'Change time', 'Cancel'], foot: 'Reply STOP to opt out' }, expect: 'Change time' },
    { bot: { text: 'No problem. Which day would you like instead?', list: 'See days', rows: [['Tue 10 Nov', 'Five times open'], ['Wed 11 Nov', 'Four times open'], ['Thu 12 Nov', 'Two times open'], ['Keep my booking', 'Sat 7 Nov, 08:00']], foot: P }, expect: 'Tue 10 Nov' },
    { bot: { text: 'These times are open on *Tuesday 10 November*:', list: 'See times', rows: [['08:00', 'Until 12:00 · with Lerato'], ['10:30', 'Until 14:30 · with Lerato'], ['13:00', 'Until 17:00 · with Thandeka'], ['Another day', 'Back to the list of days']], foot: P }, expect: '10:30' },
    { bot: { text: 'Please confirm the change:\n\nWas: Sat 7 Nov, 08:00\nNow: *Tue 10 Nov, 10:30 to 14:30*\n\nKnotless braids with Lerato', btns: ['Confirm change', 'Keep old time', 'Another time'] }, expect: 'Confirm change', owner: { moved: true, ntf: 'Lindiwe moved her booking · Sat 7 Nov 08:00 → Tue 10 Nov 10:30' } },
    { bot: { text: "Done! You're now booked for *Tuesday 10 November, 10:30 to 14:30*.\n\nKnotless braids with Lerato. We'll remind you the day before." }, expect: null },
  ];
  return [
    { bot: { text: "Sorry, I didn't quite understand that. What would you like to do?", btns: ['Book', 'My bookings', 'Ask a person'] }, expect: 'Ask a person', owner: { flag: true, ntf: 'Lindiwe asked for a person · the assistant has paused' } },
    { bot: { text: "Sure. I've asked the team to reply here. During opening hours someone usually answers within [time].\n\nYou can keep typing in the meantime." }, expect: 'owner:take', owner: { taken: true } },
    { bot: { text: "You're now chatting with *Lerato* from the salon." }, expect: 'owner:send', owner: { sent: true } },
    { bot: { staff: true, text: 'Hi Lindiwe, Lerato here. Yes, I can do a shorter knotless style. It takes about 3 hours and costs R 550. Shall I put you in for Saturday at 08:00?' }, expect: 'owner:back', owner: { back: true } },
    { bot: { text: 'Lerato has handed you back to the booking assistant. Anything else I can help with?', btns: ['Book', 'My bookings', 'No, thanks'] }, expect: null },
  ];
}

export const ownerStart = (): Owner => ({ held: false, booked: false, moved: false, flag: false, taken: false, sent: false, back: false, ntf: '' });

export function start(flow: FlowKey): Msg[] {
  const first: Msg[] = flow === 'book' ? [{ me: true, text: "Hi, I'd like to book braids", time: '09:12' }] : flow === 'person' ? [{ me: true, text: 'hi can I get shorter braids? not sure which one to pick', time: '10:39' }] : [];
  return [...first, { ...script(flow)[0].bot, time: flow === 'move' ? '18:00' : flow === 'person' ? '10:39' : '09:12' }];
}

export type Story = { flow: FlowKey; step: number; msgs: Msg[]; owner: Owner };
export const init = (flow: FlowKey): Story => ({ flow, step: 0, msgs: start(flow), owner: ownerStart() });

export type Tap = { kind: 'hint' } | { kind: 'go'; story: Story; /** The assistant's next message and what changes on the owner's side, shown after a short typing pause. */ next: { msg: Msg | null; owner: Partial<Owner> }; typing: boolean };

/** What happens when the visitor taps `label`. Tapping anything but the expected option only shows the hint. */
export function tap(s: Story, label: string): Tap {
  const sc = script(s.flow);
  const cur = sc[s.step];
  if (!cur || !cur.expect) return { kind: 'hint' };
  if (label !== cur.expect) return { kind: 'hint' };
  const nx = sc[s.step + 1];
  const time = s.flow === 'move' ? `18:2${s.step + 1}` : s.flow === 'person' ? `10:4${s.step + 1}` : `09:1${s.step + 3}`;
  const ownerTurn = label.startsWith('owner:');
  const story: Story = { ...s, step: s.step + 1, msgs: ownerTurn ? s.msgs : [...s.msgs, { me: true, text: label, time }] };
  return { kind: 'go', story, typing: Boolean(nx), next: { msg: nx ? { ...nx.bot, time } : null, owner: cur.owner ?? {} } };
}

/** Puts the assistant's reply and the owner-side change into the story once the typing pause is over. */
export const settle = (s: Story, next: { msg: Msg | null; owner: Partial<Owner> }): Story => ({ ...s, msgs: next.msg ? [...s.msgs, next.msg] : s.msgs, owner: { ...s.owner, ...next.owner } });

/** A story's message as WhatsApp would receive it, to check it against WhatsApp's limits. */
export function asOut(m: Msg): Out | null {
  const body = m.text;
  if (m.btns) return { type: 'buttons', body, footer: m.foot, buttons: m.btns.map((t, i) => ({ id: String(i), title: t })) };
  if (m.list && m.rows) return { type: 'list', body, footer: m.foot, button: m.list, rows: m.rows.map(([title, description], i) => ({ id: String(i), title, description })) };
  return m.me ? null : { type: 'text', body };
}
