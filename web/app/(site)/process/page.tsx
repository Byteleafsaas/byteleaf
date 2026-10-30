import type { Metadata } from 'next';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { CARE_BEATS, PROCESS_STEPS, TOUCH } from '@/lib/content';
import { getSite } from '@/lib/server/public';
import { siteContact } from '@/lib/siteContact';
import s from './process.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — Process',
  description: "Six clear stages, so you always know what's happening, what it costs and what comes next.",
};

export default async function Process() {
  const c = siteContact((await getSite()).business);
  const touch = TOUCH.map((t, i) => (i === 0 ? { ...t, big: c.urgent } : t));
  return (
    <main>
      <section className={`gridpaper ${s.hero}`}>
        <div className={s.heroFade} aria-hidden="true" />
        <div className={s.heroIn}>
          <span className="rise eyebrow">OUR PROCESS</span>
          <h1 className="rise d1 h1">From first call to <span className="hl">long-term care.</span></h1>
          <p className="rise d2 lead">Six clear stages, so you always know what&apos;s happening, what it costs and what comes next.</p>
        </div>
      </section>

      <section className={s.tlSec}>
        <div className={s.tl}>
          <div className={s.line} aria-hidden="true" />
          <div className={`${s.line} ${s.lineOn}`} aria-hidden="true" />
          <ol className={s.list}>
            {PROCESS_STEPS.map((st) => (
              <li key={st.n} className={s.item}>
                <span className={s.num}>{st.n}</span>
                <article className={s.step}>
                  <div className={s.stepHead}>
                    <h2>{st.title}</h2>
                    <span className={s.who}>{st.who}</span>
                  </div>
                  <p>{st.text}</p>
                  <div className={s.gets}>
                    <span className={s.getsLabel}>YOU GET</span>
                    {st.get.map((g) => <span key={g} className={s.get}>{g}</span>)}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={s.loop}>
        <div className="dots-dark" aria-hidden="true" />
        <div className={s.loopGrid}>
          <div className={s.loopText}>
            <span className="eyebrow on-dark">AFTER LAUNCH</span>
            <h2 className="h2">The care loop, every month.</h2>
            <p>On a maintenance contract your systems never sit unattended. Each month runs through the same four beats.</p>
            <div className={s.beats}>
              {CARE_BEATS.map((b) => (
                <div key={b.k} className={s.beat}><span>{b.k}</span><span>{b.v}</span></div>
              ))}
            </div>
          </div>
          <div className={s.ring} aria-hidden="true">
            <svg className={s.ringSvg} viewBox="0 0 200 200" width="100%" height="100%">
              <circle cx="100" cy="100" r="86" fill="none" stroke="#1C2B47" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="86" fill="none" stroke="#1877F2" strokeWidth="1.5" strokeDasharray="3 7" />
            </svg>
            <div className={s.orbit}><span className={s.orbitDot} /></div>
            <span className={`${s.lbl} ${s.lN}`}>Monitor</span>
            <span className={`${s.lbl} ${s.lE}`}>Triage</span>
            <span className={`${s.lbl} ${s.lS}`}>Improve</span>
            <span className={`${s.lbl} ${s.lW}`}>Report</span>
            <div className={s.disc}>
              <svg width="56" height="56" viewBox="0 0 32 32">
                <path d="M6 26C6 14 14 6 26 6C26 18 18 26 6 26Z" fill="#FFFFFF" />
                <path d="M6.5 25.5L19 13M12 20h5M15 17v-4" stroke="#1877F2" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className={s.touchCol}>
          <div className={s.touchHead}>
            <span className="eyebrow">STAYING IN TOUCH</span>
            <h2 className="h2-sub">You&apos;ll never wonder what we&apos;re working on.</h2>
          </div>
          <div className={s.touchGrid}>
            {touch.map((t) => (
              <div key={t.title} className={s.stat}>
                <span className={s.big}>{t.big}</span>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Step one is a conversation." text="Book a free 30-minute discovery call and we'll take it from there." />
      <Footer />
    </main>
  );
}
