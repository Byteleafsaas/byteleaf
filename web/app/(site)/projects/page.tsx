import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { PROJECTS } from '@/lib/content';
import { projectLabel } from '@/lib/projects-meta';
import { getLiveProjects } from '@/lib/server/public';
import ProjectGrid, { type GridProject } from './ProjectGrid';
import s from './projects.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — Projects',
  description: 'Explore the software byteleaf builds, from interactive demos and standalone products to the admin we use to run our studio.',
};

// Project cards come from the database, so refresh the page every minute.
export const revalidate = 60;

export default async function Projects() {
  const live = await getLiveProjects();
  // The featured project gets the large case-study card; the rest go in the filterable grid.
  // With nothing live yet, the design placeholders stay on show.
  const featured = live.find((p) => p.featured) ?? live[0];
  const featuredLabel = featured && projectLabel(featured.slug);
  const rest: GridProject[] = live.length
    ? live.filter((p) => p !== featured).map((p) => ({ id: p.id, slug: p.slug, type: [p.type, projectLabel(p.slug)].filter(Boolean).join(' · '), name: p.name, text: p.summary, tags: p.stack, cats: p.categories, pattern: p.pattern, cover: p.cover }))
    : PROJECTS.map((p, i) => ({ id: String(i), type: p.type, name: '[PROJECT NAME]', text: p.text, tags: p.tags, cats: p.cats, pattern: i }));

  const facts = featured
    ? [
        { k: 'THE CHALLENGE', v: featured.challenge },
        { k: 'WHAT WE DID', v: featured.whatWeDid },
        { k: featuredLabel === 'Interactive demo' ? 'WHAT YOU CAN TRY' : featuredLabel === 'Standalone product' ? 'EXPLORE THE PRODUCT' : 'THE RESULT', v: featured.result },
      ].filter((f) => f.v)
    : [
        { k: 'THE CHALLENGE', v: "[What wasn't working for the client before byteleaf.]" },
        { k: 'WHAT WE DID', v: '[Design, build, integrations — in two or three lines.]' },
        { k: 'THE RESULT', v: '[A real, measurable outcome the client agreed to share.]' },
      ];
  const stack = featured ? featured.stack : ['[Stack]', '[Stack]', '[Stack]'];

  return (
    <main>
      <section className={s.hero}>
        <div className={s.heroIn}>
          <span className="rise eyebrow">PROJECTS</span>
          <h1 className="rise d1 h1">Work that keeps businesses <span className="hl">moving.</span></h1>
          <p className="rise d2 lead">Explore the products we’ve built, the tools we use to run byteleaf and interactive demos you can try for your own business.</p>
        </div>
      </section>

      <section className={s.featWrap}>
        <article className={`card rise d3 ${s.feat}`}>
          <div aria-hidden="true" className={s.featImg}>
            <div className={s.featShot}>
              {featured?.cover ? <Image src={`/media/${featured.cover.key}`} alt="" fill quality={92} sizes="(max-width: 1000px) 100vw, 620px" priority style={{ objectFit: 'cover' }} /> : <span className={s.featLabel}>[FEATURED PROJECT SCREENSHOT]</span>}
            </div>
          </div>
          <div className={s.featBody}>
            <div className={s.badges}><span className={s.on}>Featured</span>{featuredLabel && <span>{featuredLabel}</span>}<span>{featured ? featured.industry : '[Industry]'}</span></div>
            <h2>{featured ? <Link href={`/projects/${featured.slug}`} className={s.cardLink}>{featured.name}</Link> : '[PROJECT NAME]'}</h2>
            <div className={s.facts}>
              {facts.map((f) => (
                <div key={f.k} className={s.fact}><span>{f.k}</span><p>{f.v}</p></div>
              ))}
            </div>
            <div className="tags">{stack.map((t, i) => <span key={t + i}>{t}</span>)}</div>
            {featured && <span className={s.viewMore} aria-hidden="true">View project →</span>}
          </div>
        </article>
      </section>

      <ProjectGrid projects={rest} />
      <CtaBand title="Your project could be next." text="Tell us what you're working with and we'll show you how we'd approach it." />
      <Footer />
    </main>
  );
}
