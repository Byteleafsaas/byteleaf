// The sample site's booking request form (HANDOFF-LAUNCH §3, "Contact form"). The same checks run in the browser and on the server.
import { isPlaceholder } from './rules';

export type Enquiry = { name: string; phone: string; area: string; wash: string; message: string };
export type EnquiryErrors = Partial<Record<'name' | 'phone', string>>;

export const MESSAGES = {
  missingName: 'Please tell us your name.',
  missingPhone: 'Please add your phone number so we can confirm a time.',
  badPhone: 'That number looks short. Use 10 digits, like 082 123 4567.',
  sendFailed: 'That didn’t send. Your details are still here. Check your signal and try again, or message us on WhatsApp.',
} as const;

/** A South African number: (+27 or 0) then nine digits, with spaces, dashes and brackets allowed. */
export function visitorPhoneOk(v: string): boolean {
  return /^(\+27|0)\d{9}$/.test(v.replace(/[\s\-()]/g, ''));
}

export function enquiryProblems(e: Pick<Enquiry, 'name' | 'phone'>): EnquiryErrors {
  const out: EnquiryErrors = {};
  if (!e.name.trim()) out.name = MESSAGES.missingName;
  if (!e.phone.trim()) out.phone = MESSAGES.missingPhone;
  else if (!visitorPhoneOk(e.phone)) out.phone = MESSAGES.badPhone;
  return out;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** Whether an email address from Site settings is a real one we can send enquiries to (not still a [placeholder]). */
export const canEmail = (to: string) => !isPlaceholder(to) && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to.trim());
