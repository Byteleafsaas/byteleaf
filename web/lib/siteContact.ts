// Turns the admin-managed business settings into display strings. A blank setting falls back to the design's
// [bracketed] placeholder, so the site never shows an empty gap before the owner has filled things in.
import { SITE } from './content';

type Business = { publicEmail: string; phone: string; location: string; hours: string; replyWithin: string; urgentResponse: string };

export function siteContact(b: Business) {
  const digits = b.phone.replace(/[^\d+]/g, '');
  return {
    email: b.publicEmail || SITE.email,
    emailHref: b.publicEmail ? `mailto:${b.publicEmail}` : SITE.emailHref,
    phone: b.phone || SITE.phone,
    phoneHref: b.phone ? `tel:${digits}` : SITE.phoneHref,
    hours: b.hours || SITE.hours,
    location: b.location || 'Johannesburg, South Africa',
    replyTime: b.replyWithin || SITE.replyTime,
    urgent: b.urgentResponse || '[X] hrs',
  };
}
