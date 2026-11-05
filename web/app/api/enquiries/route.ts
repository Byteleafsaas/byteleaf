import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canEmail, enquiryProblems, firstName } from '@/lib/launch/enquiry';
import { connectDB } from '@/lib/server/db';
import { sendEmail } from '@/lib/server/email';
import { getLive } from '@/lib/server/launch/store';
import { SiteEnquiry } from '@/lib/server/models';
import { rateLimit } from '@/lib/server/ratelimit';
import { SITE_SLUG } from '@/lib/launch/defaults';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().max(80), phone: z.string().trim().max(30), area: z.string().trim().max(60).default(''), wash: z.string().trim().max(60).default(''), message: z.string().trim().max(600).default(''),
  /** A field real visitors never see. Bots fill it in. */
  website: z.string().max(200).optional(),
});

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The sample site's booking form posts here: it becomes an enquiry in the admin and an email to the address in Site settings. */
export async function POST(req: Request) {
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: 'That didn’t send.' }, { status: 400 });
  if (p.data.website) return NextResponse.json({ ok: true }); // a bot: pretend it worked
  const errors = enquiryProblems(p.data);
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });
  const h = req.headers;
  const ip = h.get('cf-connecting-ip')?.trim() || h.get('x-real-ip')?.trim() || h.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
  if (!(await rateLimit(`enquiry:${ip}`, 6, 10 * 60000))) return NextResponse.json({ ok: false, error: 'Too many requests. Please try again in a few minutes.' }, { status: 429 });

  await connectDB();
  await SiteEnquiry.create({ site: SITE_SLUG, name: p.data.name, phone: p.data.phone, area: p.data.area, wash: p.data.wash, message: p.data.message });
  const to = (await getLive()).settings.email;
  if (canEmail(to)) {
    const d = p.data;
    await sendEmail({
      to, subject: `New booking request from ${firstName(d.name)}`,
      html: `<p><strong>${esc(d.name)}</strong> asked for a booking.</p><p>Phone: ${esc(d.phone)}<br>Area: ${esc(d.area)}<br>Wash: ${esc(d.wash)}</p>${d.message ? `<p>${esc(d.message)}</p>` : ''}`,
      text: `${d.name} asked for a booking.\nPhone: ${d.phone}\nArea: ${d.area}\nWash: ${d.wash}\n${d.message}`,
    }).catch(() => false);
  }
  return NextResponse.json({ ok: true });
}
