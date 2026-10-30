'use client';

import Image from 'next/image';
import { useState } from 'react';
import { PROJECT_FILTERS } from '@/lib/content';
import s from './projects.module.css';

export type GridProject = { id: string; type: string; name: string; text: string; tags: string[]; cats: string[]; pattern: number; cover?: { key: string; width: number; height: number } | null };

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
        <div className={s.grid}>
          {shown.map((p) => (
            <article key={p.id} className={`card ${s.card}`}>
              <div aria-hidden="true" className={s.imgWrap}>
                <div className={`${s.shot} ${p.cover ? '' : s[`p${p.pattern % 3}`]}`}>
                  {p.cover ? <Image src={`/media/${p.cover.key}`} alt="" fill sizes="(max-width: 760px) 100vw, 420px" style={{ objectFit: 'cover' }} /> : <span className={s.shotLabel}>[SCREENSHOT]</span>}
                </div>
              </div>
              <div className={s.body}>
                <span className={s.type}>{p.type}</span>
                <h2>{p.name}</h2>
                <p>{p.text}</p>
                <div className="tags tags-blue">{p.tags.map((t) => <span key={t}>{t}</span>)}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
