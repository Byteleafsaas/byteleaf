import type { Metadata } from 'next';
import Link from 'next/link';
import b from '@/components/booking-admin/booking.module.css';
import PublishBar from '@/components/website-admin/PublishBar';
import w from '@/components/website-admin/w.module.css';
import { SITE_SLUG } from '@/lib/launch/defaults';
import { connectDB } from '@/lib/server/db';
import { loadWebsite } from '@/lib/server/launch/admin';
import { SiteEnquiry } from '@/lib/server/models';

export const metadata: Metadata = { title: 'Overview · Website' };
export const dynamic = 'force-dynamic';

const ACTIONS = [
  { href: '/admin/website/pages/home', t: 'Edit a page', d: 'Change the words on Home, About, Contact and more.' },
  { href: '/admin/website/services', t: 'Update prices', d: 'Add, change or hide a service.' },
  { href: '/admin/website/photos', t: 'Add photos', d: 'Show off your best jobs.' },
  { href: '/admin/website/settings', t: 'Change phone or hours', d: 'One place, updated everywhere.' },
];

export default async function Page() {
  await connectDB();
  const [{ state, publish }, fresh] = await Promise.all([loadWebsite(), SiteEnquiry.find({ site: SITE_SLUG, status: 'new' }).sort({ createdAt: -1 }).limit(3).lean()]);
  const n = publish.changes.length;
  const liveAt = state.liveAt ? new Date(state.liveAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }) : '';
  return (
    <div className={w.wrapPad}>
      <div className={b.page}>
        <header className={b.header}>
          <div className={b.titleBox}><span className={b.crumb}>{state.live.settings.name}</span><h1 className={b.h1}>Overview</h1></div>
          <a className={`${b.btn} ${b.btnGhost}`} href="/projects/launch-website/sample" target="_blank" rel="noopener noreferrer">View your site</a>
        </header>
        <div className={b.pad} style={{ gap: 16 }}>
          <section className={b.panel} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }} aria-label="Site status">
            <span><span className={`${w.statePill} ${n ? w.pillUnsaved : w.pillLive}`}><span className={w.dot} aria-hidden="true" />{n ? 'CHANGES WAITING' : 'LIVE'}</span></span>
            <h2 className={b.h2}>{n ? `${n} ${n === 1 ? 'change' : 'changes'} not published` : 'Your site is up to date'}</h2>
            <span className={b.hint}>{liveAt ? `Last published ${liveAt}.` : 'Nothing published yet.'}{n ? ' Customers still see the last published version.' : ''}</span>
          </section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {ACTIONS.map((a) => (
              <Link key={a.href} href={a.href} className={b.panel} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4, textDecoration: 'none', color: 'inherit' }}>
                <strong>{a.t}</strong><span className={b.hint}>{a.d}</span>
              </Link>
            ))}
          </div>
          <section className={b.panel} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="ne">
            <span className={b.between}><h2 id="ne" className={b.h2}>New enquiries</h2><Link href="/admin/website/enquiries" className={w.lnk}>See all</Link></span>
            {fresh.length === 0 ? <span className={b.hint}>No new enquiries. When someone fills in your Contact form, it appears here.</span> : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fresh.map((e) => <li key={String(e._id)}><strong>{e.name}</strong> · {e.phone}{e.wash ? ` · ${e.wash}` : ''}</li>)}
              </ul>
            )}
          </section>
        </div>
      </div>
      <PublishBar publish={publish} previewHref="/admin/website/preview/home" />
    </div>
  );
}
