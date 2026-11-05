import { Fragment } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';
import CtaBand from '@/components/law/CtaBand';

export const metadata = { title: 'Page not found' };

export default async function Page() {
  const { tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after } = D;
  void [tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after];
  return (
    <>
<section style={css("padding: 96px 0")}><div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 22px; max-width: 820px; margin-left: auto; margin-right: auto")}>
<span className="lf-eyebrow">Page not found</span>
<h1 className="lf-hero-h" style={css("font-size: 3.5rem; font-weight: 500")}>We couldn’t find that page.</h1>
<p className="lf-lead">It may have moved, or the link may have a typo. Here is where most people go next.</p>
<div className="lf-grid" style={css("grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr))")}>{lost.map((l, i) => (<Fragment key={i}><Link className="lf-card lf-door" href={l.href}><strong style={css("font-size: 1.125rem")}>{l.t}</strong><span style={css("color: #5B5348; font-size: 1rem")}>{l.d}</span></Link></Fragment>))}</div>
<p style={css("color: #5B5348")}>Or call us on <a href={`tel:${tel}`}>{telShown}</a>. We’re happy to point you in the right direction.</p>
</div></section>
<CtaBand page="notfound" />
    </>
  );
}
