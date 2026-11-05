'use client';

import Link from 'next/link';
import { useState } from 'react';
import { css } from '@/lib/law/css';
import { D } from '@/lib/law/content';

/** Topic chips, a live count and the list of guides (HANDOFF-LAW §3, Insights). */
export default function InsightsList({ initialTopic = 'All' }: { initialTopic?: string }) {
  const [topic, setTopic] = useState(D.topics.includes(initialTopic as never) ? initialTopic : 'All');
  const shown = D.guides.filter((g) => topic === 'All' || g.topic === topic);
  return (
    <>
      <div role="group" aria-label="Filter by topic" style={css('display: flex; flex-wrap: wrap; gap: 8px')}>
        {D.topics.map((t) => (
          <button key={t} type="button" className="lf-chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>{t}</button>
        ))}
      </div>
      <p role="status" className="lf-hint">{shown.length === 1 ? '1 guide' : `${shown.length} guides`}</p>
      <div style={css('display: flex; flex-direction: column; border-top: 1px solid #DCD3C5')}>
        {shown.map((g) => (
          <article key={g.slug} style={css('display: flex; flex-wrap: wrap; gap: 8px 40px; padding: 28px 0; border-bottom: 1px solid #DCD3C5')}>
            <div style={css('flex: 0 0 200px; display: flex; flex-direction: column; gap: 6px; font-size: .9375rem; color: #5B5348')}>
              <span className="lf-eyebrow">{g.topic}</span>
              <span>{g.date} · {g.min}</span>
            </div>
            <div style={css('flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 10px')}>
              <h2 style={css('font-size: 1.625rem')}>
                <Link className="lf-tlink" href={g.href} style={css('color: #1F1C18; text-decoration: none; font: inherit; font-weight: 600')}>{g.t}</Link>
              </h2>
              <p style={css('color: #5B5348; max-width: 62ch')}>{g.d}</p>
              <span style={css('font-size: .9375rem')}>By {g.by}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
