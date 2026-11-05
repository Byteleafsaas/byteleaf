import type { Metadata } from 'next';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { BASE } from '@/lib/law/routes';
import { SC } from '@/lib/law/showcase';
import Stage from './Stage';
import s from './law.module.css';

// The drawn mini pages use the sample firm's two fonts, so they are loaded here too.
const serif = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--lf-serif', display: 'swap' });
const sans = Source_Sans_3({ subsets: ['latin'], weight: ['400', '600'], variable: '--lf-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'byteleaf — Law firm website',
  description: 'A calm, credible website for a small law firm, with the trust work built in. Switch between its pages and see what makes it work. Sample content only.',
};

export default function Page() {
  return (
    <main className={`${serif.variable} ${sans.variable}`}>
      <section className={s.hero}>
        <div className={s.heroIn}>
          <span className={s.crumb}><Link href="/projects">Projects</Link> / Law firm website</span>
          <div className={s.heroText}>
            <span className="eyebrow">SHOWCASE PROJECT 5 · WEBSITE</span>
            <h1 className="h1">Trusted before the first phone call. <span className="hl">That’s the whole job.</span></h1>
            <p className="lead">A site for a small law firm, or any practice people approach when they’re worried: accountants, clinics, consultants. No clever tool to show. The proof is how it reads, how calm it feels, and how quickly someone finds the right door.</p>
          </div>
          <div className={s.warn} role="note">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><strong>This is a demo with sample content.</strong> Ravell Ndaba Attorneys is a made-up firm. Its attorneys, fees and client words are invented, and its form sends nothing. The browser and phone are our own drawings.</span>
          </div>
        </div>
      </section>

      <section className={s.main}>
        <div className={s.mainIn} style={{ gap: 20 }}><Stage /></div>
      </section>

      <section className={s.extra}>
        <div className={s.extraIn}>
          <div className={s.real}>
            <h2>What’s included</h2>
            <ul>{SC.included.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className={s.tryCard} style={{ background: '#F4F7FB' }}>
            <p className={s.facts} style={{ flexDirection: 'column', gap: 14 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 12, letterSpacing: '.06em' }}>LIVE IN</span><b style={{ fontFamily: 'var(--font-sans)', fontSize: 30, letterSpacing: '-.03em' }}>[delivery time]</b></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 12, letterSpacing: '.06em' }}>FROM</span><b style={{ fontFamily: 'var(--font-sans)', fontSize: 30, letterSpacing: '-.03em' }}>[from price]</b></span>
            </p>
            <p className={s.muted}>Not included yet: an admin to edit pages, online booking, payments, a client portal and more than one language. Each can be added later without starting again.</p>
            <span className={s.row}><Link className="btn btn-primary btn-sm" href={BASE}>Open the full site</Link></span>
          </div>
        </div>
      </section>

      <section className={s.how}>
        <div className={s.howIn}>
          <h2 className="h2">How we set it up for you</h2>
          <ol className={s.howGrid}>
            {SC.how.map((h) => <li key={h.n} className={s.step}><span className={s.num}>{h.n}</span><h3>{h.t}</h3><p>{h.d}</p></li>)}
          </ol>
        </div>
      </section>

      <CtaBand title="Want a site like this?" text="Tell us about your practice. You’ll see a working first version, in your words, before anything goes live." />
      <Footer />
    </main>
  );
}
