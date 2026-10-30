import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { ArrowIcon, CheckIcon, ServiceIcon } from '@/components/Icon';
import HeroVisual from '@/components/home/HeroVisual';
import TechMarquee from '@/components/home/TechMarquee';
import { getLiveProjects } from '@/lib/server/public';
import { HOME_PROJECTS, HOME_SERVICES, HOME_STEPS, HOME_WORK_WITH_YOU, WHY } from '@/lib/content';
import s from './home.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — Home',
  description: 'byteleaf designs, builds and looks after the frontend, backend and AI behind established businesses — on a monthly care contract, or project by project as you need it.',
};

const CHECKS = ['Design', 'Frontend', 'Backend', 'AI integrations'];

export default async function Home() {
  // Selected work: the first three live projects (featured first); the design placeholders show until there are some.
  const live = (await getLiveProjects()).slice(0, 3);
  const homeProjects = live.length
    ? live.map((p) => ({ id: p.id, type: [p.type, p.categories.join(' + ')].filter(Boolean).join(' · '), name: p.name, text: p.summary, pattern: p.pattern, cover: p.cover }))
    : HOME_PROJECTS.map((p) => ({ id: p.type, type: p.type, name: '[PROJECT NAME]', text: '[One line on what you built and the outcome for the client.]', pattern: p.pattern, cover: null as null }));
  return (
    <main>
      <section className={`gridpaper ${s.hero}`}>
        <div className={s.heroFade} aria-hidden="true" />
        <div className={s.heroGrid}>
          <div className={s.heroCopy}>
            <div className={`rise ${s.pill}`}>
              <span className={`pulse ${s.pillDot}`} />
              Software studio · Johannesburg<span className="hide-sm">, South Africa</span>
            </div>
            <h1 className={`rise d1 ${s.h1}`}>
              Your software,
              <br />
              kept <span className="hl">growing.</span>
            </h1>
            <p className={`rise d2 ${s.heroLead}`}>
              byteleaf designs, builds and looks after the frontend, backend and AI behind established businesses — on a monthly care contract, or project by project as you need it.
            </p>
            <div className={`rise d3 ${s.heroBtns}`}>
              <Link className="btn btn-primary" href="/book">
                Book a 30-min call
                <ArrowIcon />
              </Link>
              <Link className="btn btn-ghost" href="/process">See how we work</Link>
            </div>
            <div className={`rise d4 ${s.checkRow}`}>
              {CHECKS.map((c) => (
                <span key={c}>
                  <CheckIcon size={16} />
                  {c}
                </span>
              ))}
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <TechMarquee />

      <section className="sec">
        <div className={`container ${s.col}`}>
          <div className="sec-head">
            <div className="sec-head-text">
              <span className="eyebrow">01 — WHAT WE DO</span>
              <h2 className="h2">One team for the whole stack — from the first screen to the last API call.</h2>
            </div>
            <Link className="lnk" href="/services">
              All services
              <ArrowIcon />
            </Link>
          </div>
          <div className={s.grid4}>
            {HOME_SERVICES.map((v) => (
              <article key={v.title} className={`card ${s.svc}`}>
                <span className={`ico ${s.icoTile}`}><ServiceIcon name={v.icon} /></span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
                <div className="tags">{v.tags.map((t) => <span key={t}>{t}</span>)}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={s.navy}>
        <div className={s.glow} aria-hidden="true" />
        <div className="dots-dark" aria-hidden="true" />
        <div className={s.navyIn}>
          <div className={s.navyHead}>
            <span className="eyebrow on-dark">02 — HOW WE WORK WITH YOU</span>
            <h2 className="h2">Built for established businesses that need a dependable tech partner.</h2>
            <p>Pick the arrangement that suits you today — and change it as your needs change.</p>
          </div>
          <div className={s.grid4}>
            {HOME_WORK_WITH_YOU.map((v) => (
              <article key={v.tag} className={`dcard ${s.dc}`}>
                <span className={s.dcTag}>{v.tag}</span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
                <span className={s.dcMeta}>{v.meta}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className={`container ${s.col}`}>
          <div className="sec-head">
            <div className="sec-head-text">
              <span className="eyebrow">03 — OUR PROCESS</span>
              <h2 className="h2">Clear steps. No surprises.</h2>
            </div>
            <Link className="lnk" href="/process">
              The full process
              <ArrowIcon />
            </Link>
          </div>
          <div className={s.steps}>
            <div className={s.line} aria-hidden="true" />
            <div className={`${s.line} ${s.lineOn}`} aria-hidden="true" />
            <ol className={s.stepList}>
              {HOME_STEPS.map((st) => (
                <li key={st.n}>
                  <span className={s.num}>{st.n}</span>
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className={`container ${s.col}`}>
          <div className="sec-head">
            <div className="sec-head-text">
              <span className="eyebrow">04 — SELECTED WORK</span>
              <h2 className="h2">Recent projects</h2>
            </div>
            <Link className="lnk" href="/projects">
              View all projects
              <ArrowIcon />
            </Link>
          </div>
          <div className={s.projGrid}>
            {homeProjects.map((p) => (
              <Link key={p.id} href="/projects" className={`card ${s.proj}`}>
                <div aria-hidden="true" className={`${s.shot} ${p.cover ? '' : s[`p${p.pattern}`]}`} style={p.cover ? { position: 'relative' } : undefined}>
                  {p.cover ? <Image src={`/media/${p.cover.key}`} alt="" fill sizes="(max-width: 760px) 100vw, 400px" style={{ objectFit: 'cover' }} /> : <span className={s.shotLabel}>[PROJECT SCREENSHOT]</span>}
                </div>
                <div className={s.projBody}>
                  <span className={s.projType}>{p.type}</span>
                  <h3>{p.name}</h3>
                  <p>{p.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec-tail">
        <div className={s.whyWrap}>
          <div className={s.whyHead}>
            <span className="eyebrow">05 — WHY BYTELEAF</span>
            <h2 className={s.whyH}>A local team that treats your systems like its own.</h2>
          </div>
          <div className={s.whyList}>
            {WHY.map((w) => (
              <div key={w.title} className={s.why}>
                <span className={s.rule} />
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Got a system that needs a steady hand?" text="Tell us what you're running and where it hurts. We'll come back with a clear plan — no obligation." secondary={{ href: '/contact', label: 'Send a message' }} />
      <Footer />
    </main>
  );
}
