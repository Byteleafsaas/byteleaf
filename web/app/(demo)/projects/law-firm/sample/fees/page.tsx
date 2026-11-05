import { Fragment } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';
import CtaBand from '@/components/law/CtaBand';

export const metadata = { title: 'Fees and how it works' };

export default async function Page() {
  const { tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after } = D;
  void [tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after];
  return (
    <>
<section style={css("padding: 64px 0 40px")}><div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 16px")}><span className="lf-eyebrow">Fees and how it works</span><h1 className="lf-hero-h" style={css("font-size: 3.5rem; font-weight: 500")}>You’ll know what it costs before we start.</h1><p className="lf-lead">Legal fees worry people more than almost anything else. So here is how we charge, what a first meeting involves, and what happens after it.</p></div></section>
<section style={css("padding: 8px 0 64px")}><div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 24px")}>
<h2 className="lf-sec-h">How we charge</h2>
<div className="lf-grid" style={css("grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr))")}>{charge.map((c, i) => (<Fragment key={i}><div className="lf-card" style={css("gap: 8px")}><span className="lf-eyebrow" style={css("color: #5B5348")}>{c.k}</span><h3 style={css("font-size: 1.375rem")}>{c.t}</h3><p style={css("color: #5B5348")}>{c.d}</p><span className="lf-serif" style={css("font-size: 1.5rem; margin-top: auto; padding-top: 8px")}>{c.p}</span></div></Fragment>))}</div>
<div className="lf-tw" role="region" aria-label="Hourly rates and fixed fees" tabIndex={0}><div role="table" className="lf-gt" style={css("min-width: 560px; --cols: 1.3fr 1.5fr 1fr")}><div role="row" className="lf-gr lf-gh"><span role="columnheader">Who or what</span><span role="columnheader">How it’s charged</span><span role="columnheader">Rate or fee</span></div>{rates.map((r, i) => (<Fragment key={i}><div role="row" className="lf-gr"><span role="cell">{r.w}</span><span role="cell">{r.h}</span><span role="cell">{r.p}</span></div></Fragment>))}</div></div>
</div></section>
<section className="lf-sec" style={css("background: #FFFFFF; border-block: 1px solid #DCD3C5")}><div className="lf-wrap" style={css("display: flex; flex-wrap: wrap; gap: 40px 64px")}>
<div style={css("flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 18px")}><h2 className="lf-sec-h">What a first meeting involves</h2>
<ul style={css("margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 10px; max-width: 56ch")}>{meet.map((m, i) => (<Fragment key={i}><li>{m}</li></Fragment>))}</ul></div>
<div style={css("flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 18px")}><h2 className="lf-sec-h">What happens next</h2>
<ol className="lf-steps">{next.map((s, i) => (<Fragment key={i}><li><span className="lf-n" aria-hidden="true">{s.n}</span><span style={css("display: flex; flex-direction: column; gap: 2px; padding-top: 6px")}><strong>{s.t}</strong><span style={css("color: #5B5348")}>{s.d}</span></span></li></Fragment>))}</ol></div>
</div></section>
<section className="lf-sec"><div className="lf-wrap" style={css("display: flex; flex-wrap: wrap; gap: 40px 64px")}>
<div style={css("flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 14px")}><h2 className="lf-sec-h">Costs that aren’t ours</h2><p style={css("max-width: 56ch")}>Some matters have costs paid to other people, called <strong>disbursements</strong>: for example the sheriff (the court official who delivers legal papers), court fees, the Deeds Office, or an advocate if your matter goes to the High Court. We pay them for you, show each one on your statement, and charge exactly what we paid.</p></div>
<div style={css("flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 14px")}><h2 className="lf-sec-h">Our promises</h2><ul style={css("list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px")}>{promise.map((p, i) => (<Fragment key={i}><li style={css("display: flex; gap: 12px")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9C3D24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={css("flex: none; margin-top: 2px")}><path d="M5 12l5 5L20 7"></path></svg><span>{p}</span></li></Fragment>))}</ul></div>
</div></section>
<CtaBand page="fees" />
    </>
  );
}
