import type { Metadata } from 'next';
import { SHOWCASE as M, eyebrowFor } from '@/lib/projects-meta';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { SHOWCASE as C } from '@/lib/launch/showcase-copy';
import Story from './Story';
import s from './launch.module.css';

export const metadata: Metadata = {
  title: `byteleaf — ${M.launch.name}`,
  description: 'Explore a service business website and try updating prices, publishing photos and managing enquiries in the admin walkthrough.',
};

export default function Page() {
  return (
    <main>
      <section className={s.hero}>
        <div className={s.heroIn}>
          <span className={s.crumb}><Link href="/projects">Projects</Link> / {M.launch.name}</span>
          <div className={s.heroText}>
            <span className="eyebrow">{eyebrowFor(M.launch)}</span>
            <h1 className="h1">{C.h1[0]} <span className="hl">{C.h1[1]}</span></h1>
            <p className="lead">{C.intro}</p>
          </div>
          <div className={s.warn} role="note">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><strong>Interactive demo.</strong> {C.demoNote}</span>
          </div>
        </div>
      </section>

      <section className={s.main}><div className={s.mainIn}><Story /></div></section>

      <section className={s.extra}>
        <div className={s.extraIn}>
          <div className={s.real}>
            <h2>What’s included</h2>
            <ul>{C.included.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className={s.tryCard}>
            <h2>See what customers see</h2>
            <p>Browse Tsela’s services, prices and gallery, then see how a customer would send an enquiry.</p>
            <span className={s.row}><Link className="btn btn-primary btn-sm" href="/projects/launch-website/sample">Explore the demo site</Link></span>
          </div>
        </div>
      </section>

      <section className={s.how}>
        <div className={s.howIn}>
          <h2 className="h2">{C.howTitle}</h2>
          <ol className={s.howGrid}>
            {C.how.map((h, i) => <li key={h.t} className={s.step}><span className={s.num}>0{i + 1}</span><h3>{h.t}</h3><p>{h.d}</p></li>)}
          </ol>
        </div>
      </section>

      <CtaBand title={C.cta.title} text={C.cta.text} />
      <Footer />
    </main>
  );
}
