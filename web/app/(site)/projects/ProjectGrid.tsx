'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { PROJECT_FILTERS } from '@/lib/content';
import s from './projects.module.css';

export type GridProject = { id: string; slug?: string; type: string; name: string; text: string; tags: string[]; cats: string[]; pattern: number; cover?: { key: string; width: number; height: number } | null };

export default function ProjectGrid({ projects }: { projects: GridProject[] }) {
  const [filter, setFilter] = useState<(typeof PROJECT_FILTERS)[number]>('All');
  const shown = filter === 'All' ? projects : projects.filter((p) => p.cats.includes(filter));

  return (
    <section className="sec-tail">
      <div className={s.col}>
        <div role="group" aria-label="Filter projects" className={s.filters}>
          {PROJECT_FILTERS.map((l) => (
            <button key={l} type="button" className={s.fchip} aria-pressed={l === filter} onClick={() => setFilter(l)}>
              {l}
              <span className={s.count}>{l === 'All' ? projects.length : projects.filter((p) => p.cats.includes(l)).length}</span>
            </button>
          ))}
        </div>
        {shown.length === 0 && <p className={s.empty} role="status">No projects in this category yet.</p>}
        <div className={s.grid}>
          {shown.map((p) => (
            <article key={p.id} className={`card ${s.card}`}>
              <div aria-hidden="true" className={s.imgWrap}>
                <div className={`${s.shot} ${p.cover ? '' : s[`p${p.pattern % 3}`]}`}>
                  {p.cover ? <Image src={`/media/${p.cover.key}`} alt="" fill quality={92} sizes="(max-width: 760px) 100vw, 420px" style={{ objectFit: 'cover' }} /> : <span className={s.shotLabel}>[SCREENSHOT]</span>}
                </div>
              </div>
              <div className={s.body}>
                <span className={s.type}>{p.type}</span>
                <h2>{p.slug ? <Link href={`/projects/${p.slug}`} className={s.cardLink}>{p.name}</Link> : p.name}</h2>
                <p>{p.text}</p>
                <div className="tags tags-blue">{p.tags.map((t) => <span key={t}>{t}</span>)}</div>
                {p.slug && <span className={s.viewMore} aria-hidden="true">View project →</span>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
