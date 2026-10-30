import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env';

export type Attachment = { filename: string; content: string | Buffer; contentType?: string };
export type Mail = { to: string; subject: string; html: string; text: string; attachments?: Attachment[] };

let transporter: Transporter | null = null;
function getTransport() {
  if (!env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/**
 * The single place emails leave the app. With no SMTP configured (dev) the message is printed to the
 * server console so every flow can still be exercised. Failures never throw into the caller's request:
 * a booking or message must not be lost because an email bounced.
 */
export async function sendEmail(mail: Mail): Promise<boolean> {
  const t = getTransport();
  if (!t) {
    console.log(`\n--- [dev mail] to: ${mail.to} | ${mail.subject}${mail.attachments?.length ? ` | attachments: ${mail.attachments.map((a) => a.filename).join(', ')}` : ''}\n${mail.text}\n---\n`);
    return true;
  }
  try {
    await t.sendMail({ from: env.MAIL_FROM, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text, attachments: mail.attachments });
    return true;
  } catch (e) {
    console.error('[mail] failed to send', mail.subject, '→', mail.to, e);
    return false;
  }
}
