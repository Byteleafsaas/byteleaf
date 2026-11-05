import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import Link from 'next/link';
import { logoWord } from '@/lib/launch/rules';
import { closedLine, hoursLine, siteHref, telHref, waLink } from '@/lib/launch/site';
import { getView } from '@/lib/server/launch/store';
import SiteNav from './SiteNav';
import s from './site.module.css';

// Two families, latin only, swapped in when loaded. The display face is only used for headings.
const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '800'], variable: '--ts-font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--ts-font-body', display: 'swap' });

export const metadata: Metadata = { title: { default: 'Tsela Mobile Wash (demo site)', template: '%s · Tsela Mobile Wash (demo)' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SampleLayout({ children }: { children: React.ReactNode }) {
  const { snap: live, draft } = await getView();
  const biz = live.settings;
  const tel = telHref(biz.phone);
  const word = logoWord(biz.name);
  const wa = waLink(biz);
  const external = wa.startsWith('http');
  return (
    <div className={`${s.ts} ${display.variable} ${body.variable}`}>
      <div role="note" className={s.demoStrip}>{draft ? 'Preview of your saved changes. Customers can’t see this until you publish.' : 'Demo site by byteleaf · a sample business with made-up details'}</div>
      <a href="#main" className={s.sr}>Skip to the content</a>
      <header className={s.header}>
        <div className={`${s.wrap} ${s.headIn}`} style={{ position: 'relative' }}>
          <Link href={siteHref('')} className={s.logo} aria-label={`${biz.name} home`}>
            <span className={`${s.disp} ${s.logoWord}`}>{word}<span className={s.logoDot}>.</span></span>
            <span className={s.logoSub}>Mobile car wash</span>
          </Link>
          <SiteNav tel={tel} />
        </div>
      </header>
      <main id="main">
        {children}
        <section className={s.cta} aria-labelledby="cta">
          <div className={`${s.wrap} ${s.ctaIn}`}>
            <h2 id="cta" className={s.h2}>Ready for a clean car?</h2>
            <span className={s.row}>
              <Link href={siteHref('contact')} className={`${s.b} ${s.bPine}`}>Book a wash</Link>
              {tel ? <a className={`${s.b} ${s.bLine}`} href={tel}>Call {biz.phone}</a> : <span className={`${s.b} ${s.bLine}`}>Call {biz.phone}</span>}
            </span>
          </div>
        </section>
      </main>
      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footTop}`}>
          <div className={s.footCol} style={{ gap: 8 }}>
            <span className={s.disp} style={{ fontSize: 28 }}>{word}<span style={{ color: '#F5B700' }}>.</span></span>
            <span className={s.m}>Mobile car wash · Pretoria</span>
          </div>
          <div className={s.footCol}><strong>Hours</strong><span>{hoursLine(biz.hours)}</span><span>{closedLine(biz.hours)}</span></div>
          <div className={s.footCol}><strong>Contact</strong>{tel ? <a href={tel}>{biz.phone}</a> : <span style={{ color: '#FAF6EC' }}>{biz.phone}</span>}<span>{biz.email}</span></div>
        </div>
        <div className={`${s.wrap} ${s.footBot}`}><span>© 2026 {biz.name} · sample business</span><span>Website by byteleaf (demo)</span></div>
      </footer>
      <div className={s.callbar}>
        {tel ? <a className={`${s.b} ${s.bLine}`} href={tel} style={{ flex: 1 }}>Call</a> : <Link className={`${s.b} ${s.bLine}`} href={siteHref('contact')} style={{ flex: 1 }}>Call</Link>}
        <a className={`${s.b} ${s.bSun}`} href={wa} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{ flex: 2 }}>WhatsApp us</a>
      </div>
    </div>
  );
}
