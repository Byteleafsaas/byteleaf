import type { Metadata } from 'next';
import b from '@/components/booking-admin/booking.module.css';
import EnquiryRow, { type EnquiryView } from '@/components/website-admin/EnquiryRow';
import w from '@/components/website-admin/w.module.css';
import { SITE_SLUG } from '@/lib/launch/defaults';
import { connectDB } from '@/lib/server/db';
import { getSite } from '@/lib/server/launch/store';
import { SiteEnquiry } from '@/lib/server/models';

export const metadata: Metadata = { title: 'Enquiries · Website' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  await connectDB();
  const [{ state }, docs] = await Promise.all([getSite(), SiteEnquiry.find({ site: SITE_SLUG }).sort({ createdAt: -1 }).limit(100).lean()]);
  const rows: EnquiryView[] = docs.map((d) => ({
    id: String(d._id), name: d.name, phone: d.phone, area: d.area ?? '', wash: d.wash ?? '', message: d.message ?? '', status: d.status as EnquiryView['status'],
    at: new Date(d.createdAt as Date).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }),
  }));
  return (
    <div className={w.wrapPad}>
      <div className={b.page}>
        <header className={b.header}><div className={b.titleBox}><span className={b.crumb}>{state.live.settings.name} / Website</span><h1 className={b.h1}>Enquiries</h1></div></header>
        <div className={b.pad} style={{ gap: 12 }}>
          {rows.length === 0 ? (
            <div className={b.panel} style={{ padding: 28, textAlign: 'center' }}><h2 className={b.h2}>No enquiries yet</h2><p className={b.hint}>Requests sent from the Contact page of your site show up here.</p></div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>{rows.map((r) => <EnquiryRow key={r.id} e={r} />)}</ul>
          )}
        </div>
      </div>
    </div>
  );
}
