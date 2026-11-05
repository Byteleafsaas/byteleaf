'use client';

import { Fragment, useState } from 'react';
import { css } from '@/lib/law/css';
import { D } from '@/lib/law/content';

/** "How it usually goes" for family law: the agreed divorce (5 steps), or the contested one (8) with a text button to switch. */
export default function AreaSteps({ initialLong = false }: { initialLong?: boolean }) {
  const [long, setLong] = useState(initialLong);
  const steps = long ? D.flHowLong : D.flHowShort;
  const intro = long
    ? 'A contested divorce, where you don’t agree on everything, has more steps. Most matters settle somewhere along the way.'
    : 'An agreed divorce, step by step. If you don’t agree on everything, there are more steps.';
  return (
    <section id="fl-how" style={css('display: flex; flex-direction: column; gap: 18px; scroll-margin-top: 140px')}>
      <h2 style={css('font-size: 2rem')}>How it usually goes</h2>
      <p style={css('color: #5B5348; max-width: 60ch')}>{intro}</p>
      <ol className="lf-steps">
        {steps.map((s) => (
          <Fragment key={s.n + s.t}>
            <li>
              <span className="lf-n" aria-hidden="true">{s.n}</span>
              <span style={css('display: flex; flex-direction: column; gap: 4px; padding-top: 6px; max-width: 62ch')}>
                <strong style={css('font-size: 1.125rem')}>{s.t}</strong>
                <span style={css('color: #5B5348')}>{s.d}</span>
                <span style={css('font-size: .9375rem; color: #5B5348')}>Usually takes: <strong style={css('color: #1F1C18')}>{s.time}</strong></span>
              </span>
            </li>
          </Fragment>
        ))}
      </ol>
      <button type="button" className="lf-tlink" onClick={() => setLong((v) => !v)} aria-expanded={long}>
        {long ? 'Show the agreed divorce steps' : 'Show the steps for a contested divorce'}
      </button>
    </section>
  );
}
