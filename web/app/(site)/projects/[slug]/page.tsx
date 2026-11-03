import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { ArrowIcon } from '@/components/Icon';
import { getLiveProjects } from '@/lib/server/public';
import s from './detail.module.css';

// Project cards come from the database, so refresh every minute.
export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getLiveProjects()).find((x) => x.slug === slug);
  return p ? { title: `byteleaf — ${p.name}`, description: p.summary || `${p.name}, a ${p.type || 'project'} by byteleaf.` } : { title: 'byteleaf — Project' };
}

const external = (href: string) => /^https?:\/\//.test(href);

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const all = await getLiveProjects();
  const p = all.find((x) => x.slug === slug);
  if (!p) notFound();
  const others = all.filter((x) => x.id !== p.id).slice(0, 3);
  const parts = [{ k: 'THE CHALLENGE', v: p.challenge }, { k: 'WHAT WE DID', v: p.whatWeDid }, { k: 'THE RESULT', v: p.result }].filter((x) => x.v);

  return (
    <main>
      <section className={s.hero}>
        <div className={s.heroIn}>
          <div className={s.text}>
            <span className={s.crumb}><Link href="/projects">Projects</Link> / {p.name}</span>
            {p.type && <span className="eyebrow">{p.type.toUpperCase()}</span>}
            <h1 className="h1">{p.name}</h1>
            {p.summary && <p className="lead">{p.summary}</p>}
            <div className={s.meta}>
              {p.client && <span className="on">{p.client}</span>}
              {p.industry && p.industry !== 'Other' && <span>{p.industry}</span>}
              {p.categories.map((c) => <span key={c}>{c}</span>)}
            </div>
            <div className={s.btns}>
              {p.demoUrl && (external(p.demoUrl)
                ? <a className="btn btn-primary" href={p.demoUrl} target="_blank" rel="noopener noreferrer">Try it live<ArrowIcon /></a>
                : <Link className="btn btn-primary" href={p.demoUrl}>Try it live<ArrowIcon /></Link>)}
              <Link className={`btn ${p.demoUrl ? 'btn-ghost' : 'btn-primary'}`} href="/book">Talk to us about yours{!p.demoUrl && <ArrowIcon />}</Link>
            </div>
          </div>
          <div aria-hidden="true" className={`${s.shot} ${p.cover ? '' : s[`p${p.pattern % 3}`]}`}>
            {p.cover ? <Image src={`/media/${p.cover.key}`} alt="" fill priority sizes="(max-width: 960px) 100vw, 560px" style={{ objectFit: 'cover' }} /> : <span className={s.shotLabel}>[SCREENSHOT]</span>}
          </div>
        </div>
      </section>

      <section className={s.body}>
        <div className={s.bodyIn}>
          <div className={s.story}>
            {parts.length ? parts.map((x) => <section key={x.k}><h2>{x.k}</h2><p>{x.v}</p></section>) : <p>The full write-up for this project is coming soon.</p>}
          </div>
          <aside className={s.aside} aria-label="Project details">
            <dl>
              {p.client && <div><dt>Client</dt><dd>{p.client}</dd></div>}
              {p.industry && p.industry !== 'Other' && <div><dt>Industry</dt><dd>{p.industry}</dd></div>}
              {p.categories.length > 0 && <div><dt>Services</dt><dd>{p.categories.join(' · ')}</dd></div>}
            </dl>
            {p.stack.length > 0 && <div className="tags tags-blue">{p.stack.map((t) => <span key={t}>{t}</span>)}</div>}
          </aside>
        </div>
        {p.gallery.length > 0 && (
          <div className={s.gallery}>
            {p.gallery.map((g) => <div key={g.key}><Image src={`/media/${g.key}`} alt={g.alt || ''} fill sizes="(max-width: 700px) 100vw, 400px" style={{ objectFit: 'cover' }} /></div>)}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section className={s.more}>
          <div className={s.moreIn}>
            <h2 className="h2-sub">More projects</h2>
            <div className={s.moreGrid}>
              {others.map((o) => <Link key={o.id} href={`/projects/${o.slug}`} className={s.card}><span>{o.type}</span><b>{o.name}</b><p>{o.summary}</p></Link>)}
            </div>
          </div>
        </section>
      )}

      <CtaBand title="Your project could be next." text="Tell us what you're working with and we'll show you how we'd approach it." />
      <Footer />
    </main>
  );
}
