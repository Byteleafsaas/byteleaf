import 'server-only';
import { fmtLong, formatZAR } from '@/lib/admin/format';
import { env } from './env';
import { sendEmail, type Attachment } from './email';
import { bookingIcs } from './ics';

// One simple on-brand layout for every email (HANDOFF-ADMIN §10): white, wordmark, 16px text, one #166FE5 button.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl = (s: string) => esc(s).replace(/\n/g, '<br>');

function layout(body: string, button?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F4F7FB;padding:24px;font-family:Geist,-apple-system,'Segoe UI',Arial,sans-serif;color:#0B1220">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E3E9F2;border-radius:16px;padding:32px">
<div style="font-weight:700;font-size:22px;letter-spacing:-0.04em;margin-bottom:24px">byte<span style="color:#1877F2">leaf</span></div>
<div style="font-size:16px;line-height:1.6">${body}</div>
${button ? `<p style="margin:28px 0 0"><a href="${button.href}" style="display:inline-block;background:#166FE5;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:999px">${esc(button.label)}</a></p>` : ''}
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #E3E9F2;font-size:13px;color:#4B5872">byteleaf · Johannesburg</div>
</div></body></html>`;
}
const p = (s: string) => `<p style="margin:0 0 16px">${s}</p>`;
const text = (lines: string[], button?: { label: string; href: string }) => [...lines, ...(button ? ['', `${button.label}: ${button.href}`] : []), '', 'byteleaf · Johannesburg'].join('\n');

type Mail = { to: string; subject: string; paragraphs: string[]; button?: { label: string; href: string }; attachments?: Attachment[] };
function send(m: Mail) {
  return sendEmail({ to: m.to, subject: m.subject, html: layout(m.paragraphs.map((x) => p(nl(x))).join(''), m.button), text: text(m.paragraphs, m.button), attachments: m.attachments });
}
const admin = (path: string) => `${env.APP_URL}${path}`;

type B = { id: string; name: string; email: string; company: string; typeLabel: string; where: string; durationMin: number; date: string; time: string; note: string };

export const mail = {
  bookingCreatedOwner: (to: string, b: B) =>
    send({ to, subject: `New booking request — ${b.name}`, paragraphs: [`${b.name}${b.company ? ` (${b.company})` : ''} asked for a ${b.typeLabel}.`, `${fmtLong(b.date)} at ${b.time} SAST · ${b.durationMin} min`, b.note ? `Their note:\n${b.note}` : 'No note left.'], button: { label: 'Open in admin', href: admin(`/admin/bookings?id=${b.id}`) } }),

  bookingReceivedClient: (b: B) =>
    send({ to: b.email, subject: `We've got your request for ${b.typeLabel}`, paragraphs: [`Hi ${b.name.split(' ')[0]},`, `Thanks for booking a ${b.typeLabel} with byteleaf for ${fmtLong(b.date)} at ${b.time} SAST. We'll confirm shortly.`] }),

  bookingConfirmedClient: (b: B) =>
    send({
      to: b.email, subject: `Confirmed: ${b.typeLabel}, ${fmtLong(b.date)}`,
      paragraphs: [`Hi ${b.name.split(' ')[0]},`, `Your ${b.typeLabel} is confirmed for ${fmtLong(b.date)} at ${b.time} SAST (${b.durationMin} min).`, `Where: ${b.where === 'Video call' ? '[meeting link]' : b.where}`, 'A calendar invite is attached.'],
      attachments: [{ filename: 'byteleaf-meeting.ics', content: bookingIcs(b), contentType: 'text/calendar; method=REQUEST' }],
    }),

  bookingRescheduledClient: (b: B, message: string) =>
    send({
      to: b.email, subject: `New time for your ${b.typeLabel}`,
      paragraphs: [`Hi ${b.name.split(' ')[0]},`, message || 'We need to move your meeting.', `New time: ${fmtLong(b.date)} at ${b.time} SAST.`, 'An updated calendar invite is attached.'],
      attachments: [{ filename: 'byteleaf-meeting.ics', content: bookingIcs(b), contentType: 'text/calendar; method=REQUEST' }],
    }),

  bookingClosedClient: (b: B, verb: 'declined' | 'cancelled', reason: string) =>
    send({ to: b.email, subject: `Your ${b.typeLabel} was ${verb}`, paragraphs: [`Hi ${b.name.split(' ')[0]},`, `Your ${b.typeLabel} on ${fmtLong(b.date)} at ${b.time} SAST has been ${verb}.`, reason || '', 'You are welcome to pick another time.'].filter(Boolean), button: { label: 'Book another time', href: `${env.APP_URL}/book` } }),

  newMessageOwner: (to: string, m: { id: string; name: string; company: string; email: string; needs: string[]; message: string }) =>
    send({ to, subject: `New message from ${m.name}`, paragraphs: [`${m.name}${m.company ? ` (${m.company})` : ''} · ${m.email}`, m.needs.length ? `Help with: ${m.needs.join(', ')}` : '', m.message.slice(0, 600)].filter(Boolean), button: { label: 'Open in admin', href: admin(`/admin/messages?id=${m.id}`) } }),

  assistantHandoverOwner: (to: string, h: { business: string; name: string; contact: string; question: string }) =>
    send({ to, subject: `${h.business} assistant: ${h.name} asked for a person`, paragraphs: [`${h.name} · ${h.contact}`, h.question ? `Question: ${h.question}` : 'No question was added.', `They asked to talk to a person from the ${h.business} assistant.`] }),

  passwordReset: (to: string, link: string, minutes: number) =>
    send({ to, subject: 'Reset your byteleaf admin password', paragraphs: ['Use the button below to choose a new password.', `The link works once and expires in ${minutes} minutes. If you didn't ask for this, you can ignore this email.`], button: { label: 'Set a new password', href: link } }),

  documentSent: (to: string, d: { kind: 'quote' | 'invoice'; number: string; total: number; date: string | null; contact: string }, pdf: Buffer | null) =>
    send({
      to, subject: `${d.kind === 'quote' ? 'Quote' : 'Invoice'} ${d.number} from byteleaf`,
      paragraphs: [`Hi ${d.contact.split(' ')[0] || 'there'},`, `Please find ${d.kind === 'quote' ? 'quote' : 'invoice'} ${d.number} attached.`, `Total: ${formatZAR(d.total)}${d.date ? `\n${d.kind === 'quote' ? 'Valid until' : 'Due'}: ${fmtLong(d.date)}` : ''}`],
      attachments: pdf ? [{ filename: `byteleaf-${d.number}.pdf`, content: pdf, contentType: 'application/pdf' }] : undefined,
    }),

  paymentReminder: (to: string, d: { number: string; total: number; dueDate: string; contact: string }, pdf: Buffer | null) =>
    send({
      to, subject: `Reminder: invoice ${d.number} is overdue`,
      paragraphs: [`Hi ${d.contact.split(' ')[0] || 'there'},`, `Invoice ${d.number} for ${formatZAR(d.total)} was due on ${fmtLong(d.dueDate)}. If you've already paid, thank you — please ignore this note.`],
      attachments: pdf ? [{ filename: `byteleaf-${d.number}.pdf`, content: pdf, contentType: 'application/pdf' }] : undefined,
    }),

  paymentReceived: (to: string, d: { number: string; total: number; paidOn: string; contact: string }) =>
    send({ to, subject: `Payment received — ${d.number}`, paragraphs: [`Hi ${d.contact.split(' ')[0] || 'there'},`, `Thank you. We received ${formatZAR(d.total)} for invoice ${d.number} on ${fmtLong(d.paidOn)}.`] }),
};
