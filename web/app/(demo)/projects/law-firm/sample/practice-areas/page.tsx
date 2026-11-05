import { Fragment } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';
import CtaBand from '@/components/law/CtaBand';

export const metadata = { title: 'Practice areas' };

export default async function Page() {
  const { tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after } = D;
  void [tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after];
  return (
    <>
<section style={css("padding: 64px 0 32px")}><div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 16px")}><span className="lf-eyebrow">Practice areas</span><h1 className="lf-hero-h" style={css("font-size: 3.5rem; font-weight: 500")}>Six areas, one way of working.</h1><p className="lf-lead">Each page explains what we help with, how it usually goes, what to bring and what it typically costs. If your matter is not here, ask us. If we can’t help, we will tell you who can.</p></div></section>
<section style={css("padding: 16px 0 72px")}><div className="lf-wrap"><div className="lf-grid">
{areas.map((a, i) => (<Fragment key={i}><article className="lf-card" style={css("padding: 28px; gap: 14px")}><h2 style={css("font-size: 1.625rem")}>{a.n}</h2><p style={css("color: #5B5348")}>{a.q}</p><ul style={css("margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px")}>{a.ex.map((x, i) => (<Fragment key={i}><li>{x}</li></Fragment>))}</ul><p style={css("font-size: .9375rem; color: #5B5348; border-top: 1px solid #DCD3C5; padding-top: 12px; margin-top: auto")}>Usually starts with: <strong style={css("color: #1F1C18")}>{a.first}</strong></p><Link className="lf-b lf-b-line" href={a.href} style={css("align-self: flex-start; min-height: 48px")}>{a.cta}</Link></article></Fragment>))}
</div></div></section>
<CtaBand page="areas" />
    </>
  );
}
