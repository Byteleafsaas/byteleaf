import type { Metadata } from 'next';
import { SHOWCASE as M, eyebrowFor } from '@/lib/projects-meta';
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
  title: `byteleaf — ${M.law.name}`,
  description: 'Explore a law firm website demo with plain-language practice pages, consultation fees and a clear way to ask for help.',
};

export default function Page() {
  return (
    <main className={`${serif.variable} ${sans.variable}`}>
      <section className={s.hero}>
        <div className={s.heroIn}>
          <span className={s.crumb}><Link href="/projects">Projects</Link> / {M.law.name}</span>
          <div className={s.heroText}>
            <span className="eyebrow">{eyebrowFor(M.law)}</span>
            <h1 className="h1">Help clients know <span className="hl">where to start.</span></h1>
            <p className="lead">A law firm website that helps prospective clients find the right practice area, see what a consultation costs and decide how to get in touch.</p>
          </div>
          <div className={s.warn} role="note">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><strong>Interactive demo.</strong> Ravell Ndaba Attorneys is a fictional firm. Its people and fees are sample content. The consultation form doesn’t send or store your details.</span>
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
            <h2>Follow a client’s first visit</h2>
            <p>Start on the family law page, check the consultation fees and try the form with sample details.</p>
            <span className={s.row}><Link className="btn btn-primary btn-sm" href={BASE}>Explore the demo site</Link></span>
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
