import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { ArrowIcon } from '@/components/Icon';
import { ABOUT_PRINCIPLES, FOUNDER } from '@/lib/content';
import { getSite } from '@/lib/server/public';
import { siteContact } from '@/lib/siteContact';
import s from './about.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — About',
  description: 'byteleaf is a Johannesburg software studio. We design, build and look after the systems businesses run on, from a first website to long-running platforms.',
};

const LEAF = 'M6 26C6 14 14 6 26 6C26 18 18 26 6 26Z';
const icon = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export default async function About() {
  const c = siteContact((await getSite()).business);
  return (
    <main>
      <section className={`gridpaper ${s.hero}`}>
        <div className={s.heroFade} aria-hidden="true" />
        <div className={s.heroIn}>
          <div className={s.heroText}>
            <span className="rise eyebrow">ABOUT BYTELEAF</span>
            <h1 className="rise d1 h1">The team that keeps your software <span className="hl">growing.</span></h1>
            <p className="rise d2 lead">byteleaf is a Johannesburg software studio. We design, build and look after the systems businesses run on, whether you are just starting out or have been trading for years — and we stay around after launch.</p>
            <div className={`rise d3 ${s.btns}`}>
              <Link className="btn btn-primary" href="/book">Meet us on a call<ArrowIcon /></Link>
              <Link className="btn btn-ghost" href="/services">What we do</Link>
            </div>
          </div>

          <div className={`rise d2 ${s.hv}`} aria-hidden="true">
            <svg className={s.ring} viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="94" fill="none" stroke="#E3E9F2" strokeWidth="0.8" />
              <circle cx="100" cy="100" r="94" fill="none" stroke="#1877F2" strokeWidth="0.8" strokeDasharray="1.5 7" />
              <circle cx="100" cy="100" r="66" fill="none" stroke="#E3E9F2" strokeWidth="0.8" />
            </svg>
            <div className={`float1 ${s.tile}`}>
              <svg className={s.leaf} width="128" height="128" viewBox="0 0 32 32">
                <path d={LEAF} fill="#FFFFFF" />
                <path d="M6.5 25.5L19 13M12 20h5M15 17v-4" stroke="#1877F2" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                <circle cx="19" cy="13" r="1.4" fill="#1877F2" />
              </svg>
            </div>
            <span className={`float2 mono ${s.chip} ${s.chipA}`}>design → frontend</span>
            <span className={`float3 mono ${s.chip} ${s.chipDark}`}>backend + AI ✓</span>
            <span className={`float2 ${s.chip} ${s.chipPill}`}><span className={`pulse ${s.dot}`} />Johannesburg · SAST</span>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className={s.story}>
          <div className={s.col16}>
            <span className="eyebrow">01 — WHY BYTELEAF</span>
            <h2 className="h2">One place to go for everything your business needs from software.</h2>
          </div>
          <div className={s.body}>
            <p>I started byteleaf because every business, whether it is just starting out or has been trading for years, ends up needing software, and too often has nobody dependable to turn to. byteleaf is built to be the one solution for everything business: a website for a brand-new idea, a booking system, an internal tool, an AI assistant.</p>
            <p>Some people need something once: a single service, built well and handed over. Others need us urgently, when something breaks, a developer disappears or a deadline will not wait. We step in, fix it properly and keep things steady.</p>
            <p>And many already have software that works but has grown old. We modernise it and improve it step by step, without stopping the business while we do it.</p>
          </div>
        </div>
      </section>

      <section className="sec-tail">
        <div className={s.name}>
          <div className="dots-dark" aria-hidden="true" />
          <div className={s.nameGlow} aria-hidden="true" />
          <div className={s.nameHead}>
            <span className="eyebrow on-dark">02 — THE NAME</span>
            <h2>Why “byteleaf”?</h2>
          </div>
          <div className={s.eq} aria-hidden="true">
            <div className={`float1 ${s.eqCard}`}><span className={`mono ${s.eqNum}`}>01</span></div>
            <span className={`mono ${s.eqOp}`}>+</span>
            <div className={`float2 ${s.eqCard}`}><svg width="64" height="64" viewBox="0 0 32 32"><path d={LEAF} fill="#6FAEFF" /></svg></div>
            <span className={`mono ${s.eqOp}`}>=</span>
            <div className={`float3 ${s.eqCard} ${s.eqMark}`}>
              <svg width="72" height="72" viewBox="0 0 32 32">
                <path d={LEAF} fill="#FFFFFF" />
                <path d="M6.5 25.5L19 13M12 20h5M15 17v-4" stroke="#1877F2" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>
          <div className={s.caps}>
            <div className={s.cap}><span className="mono">BYTE</span><p>The code — the frontend, backend and AI that do the work.</p></div>
            <div className={s.cap}><span className="mono">LEAF</span><p>Growth — software that&apos;s tended and keeps getting better, not built once and left.</p></div>
            <div className={s.cap}><span className="mono">THE MARK</span><p>A leaf with a circuit for a vein: living systems, wired with care.</p></div>
          </div>
        </div>
      </section>

      <section className="sec-tail">
        <div className={s.think}>
          <div className={s.thinkHead}>
            <span className="eyebrow">03 — HOW WE THINK</span>
            <h2 className="h2">Four things we won&apos;t compromise on.</h2>
          </div>
          <div className={s.grid4}>
            {ABOUT_PRINCIPLES.map((p) => (
              <article key={p.n} className={s.card}>
                <span className={`mono ${s.num}`}>{p.n}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`sec ${s.who}`}>
        <div className={s.whoIn}>
          <div className={s.photoWrap}>
            <div className={s.photoBlock} aria-hidden="true" />
            <div className={s.photo} role="img" aria-label="Photo of the founder (placeholder)">
              <span className={`mono ${s.photoTag}`}>[FOUNDER PHOTO]</span>
            </div>
          </div>
          <div className={s.whoText}>
            <span className="eyebrow">04 — WHO YOU&apos;LL WORK WITH</span>
            <h2 className="h2" style={{ textWrap: 'initial' }}>{FOUNDER.name}</h2>
            <span className={s.role}>{FOUNDER.role}</span>
            <p>When you work with byteleaf, you deal with the person building your software — no hand-offs and no call centres.</p>
            <p className={s.bio}>{FOUNDER.bio}</p>
            <div className={s.socials}>
              <a className={s.soc} href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${FOUNDER.first} on LinkedIn`}>
                <svg {...icon}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></svg>LinkedIn
              </a>
              <a className={s.soc} href={FOUNDER.github} target="_blank" rel="noopener noreferrer" aria-label={`${FOUNDER.first} on GitHub`}>
                <svg {...icon}><path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 0 0-1.3-3.3 4.5 4.5 0 0 0-.1-3.3s-1.1-.3-3.4 1.3a11.6 11.6 0 0 0-6.2 0C6.7 2.1 5.6 2.4 5.6 2.4a4.5 4.5 0 0 0-.1 3.3A4.8 4.8 0 0 0 4.2 9c0 4.8 3 5.9 5.8 6.2a3 3 0 0 0-.8 2.3V21" /></svg>GitHub
              </a>
              <Link className={s.soc} href="/book">
                <svg {...icon}><path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" /></svg>Book time with {FOUNDER.first}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className={s.where}>
          <div className={s.whereText}>
            <span className="eyebrow">05 — WHERE WE WORK</span>
            <h2 className="h2-sub">Local when it helps. Remote when it&apos;s faster.</h2>
            <p>We&apos;re based in {c.location.split(',')[0]} and work South African business hours. Meet us in person, or keep everything on video calls and a shared chat.</p>
          </div>
          <div className={`${s.card} ${s.mode}`}>
            <span className={s.ico}><svg {...icon} width={22} height={22}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg></span>
            <h3>In person</h3>
            <p>Workshops and kick-offs at your office or ours in {c.location.split(',')[0]}.</p>
          </div>
          <div className={`${s.card} ${s.mode}`}>
            <span className={s.ico}><svg {...icon} width={22} height={22}><rect x="2" y="5" width="15" height="14" rx="2" /><path d="M17 10l5-3v10l-5-3" /></svg></span>
            <h3>Remote</h3>
            <p>Video calls, a shared channel and weekly written updates, wherever you are.</p>
          </div>
        </div>
      </section>

      <CtaBand title="Let's get to know each other." text="Tell us about your business on a free 30-minute call." secondary={{ href: '/contact', label: 'Send a message' }} />
      <Footer />
    </main>
  );
}
