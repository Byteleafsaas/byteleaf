import { Fragment } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';
import CtaBand from '@/components/law/CtaBand';

export const metadata = { title: 'Ravell Ndaba Attorneys' };

export default async function Page({ searchParams }: { searchParams: Promise<{ photos?: string }> }) {
  const q = await searchParams;
  const photos = q.photos !== 'false';
  const noPhotos = !photos;
  const { tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after } = D;
  void [tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after];
  return (
    <>
<section className="lf-hero" style={css("padding: 72px 0 80px")}>
<div className="lf-wrap" style={css("display: flex; flex-wrap: wrap; gap: 48px; align-items: center")}>
<div style={css("flex: 1.25 1 480px; min-width: 0; display: flex; flex-direction: column; gap: 24px")}>
<span className="lf-eyebrow">Independent attorneys in Rosebank, Johannesburg</span>
<h1 className="lf-hero-h" style={css("font-size: 4rem; font-weight: 500")}>Plain advice, from people who <em style={css("font-style: italic; color: #9C3D24")}>pick up the phone.</em></h1>
<p className="lf-lead">We are five attorneys helping families, homeowners, employees and small businesses through divorce, wills, property, work disputes and contracts. You speak to an attorney from the first call.</p>
<div style={css("display: flex; flex-wrap: wrap; gap: 12px")}><Link className="lf-b lf-b-clay" href={R.contact}>Request a consultation</Link><a className="lf-b lf-b-line" href={`tel:${tel}`}>Call {telShown}</a></div>
<p style={css("font-size: 1rem; color: #5B5348")}>First consultation, 30 minutes: <strong style={css("color: #1F1C18")}>R [amount]</strong>. <Link className="lf-tlink" href={R.fees}>How our fees work</Link></p>
</div>
<div style={css("flex: 1 1 360px; min-width: 0")}>
<div className="lf-card" style={css("padding: 32px; gap: 20px; border-radius: 18px; box-shadow: 0 30px 60px -40px rgba(31,28,24,.45)")}>
<h2 style={css("font-size: 1.5rem")}>How it starts</h2>
<ol className="lf-steps">{start.map((s, i) => (<Fragment key={i}><li><span className="lf-n" aria-hidden="true">{s.n}</span><span style={css("padding-top: 7px")}>{s.t}</span></li></Fragment>))}</ol>
<p style={css("font-size: .9375rem; color: #5B5348; border-top: 1px solid #DCD3C5; padding-top: 16px")}>You decide whether to go ahead only after you have a written plan and estimate.</p>
</div>
</div>
</div>
</section>

<section className="lf-sec" aria-labelledby="h-areas" style={css("background: #FFFFFF; border-block: 1px solid #DCD3C5")}>
<div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 32px")}>
<div style={css("display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px")}><div style={css("display: flex; flex-direction: column; gap: 10px")}><span className="lf-eyebrow">What we help with</span><h2 id="h-areas" className="lf-sec-h">Find the right door</h2></div><Link className="lf-tlink" href={R.areas}>All practice areas</Link></div>
<div className="lf-grid">{areas.map((a, i) => (<Fragment key={i}><Link className="lf-card lf-door" href={a.href}><span className="lf-serif" style={css("font-size: 1.375rem")}>{a.n}</span><span style={css("color: #5B5348")}>{a.q}</span><span className="lf-go">Read more <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></span></Link></Fragment>))}</div>
<p style={css("color: #5B5348")}>Not sure which one fits? <Link className="lf-tlink" href={R.contact}>Tell us briefly what happened</Link> and we will point you to the right person.</p>
</div>
</section>

<section className="lf-sec" aria-labelledby="h-why">
<div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 32px")}>
<h2 id="h-why" className="lf-sec-h" style={css("max-width: 18em")}>Why people trust a small firm with big moments</h2>
<div className="lf-grid">{why.map((w, i) => (<Fragment key={i}><div style={css("display: flex; flex-direction: column; gap: 10px; border-top: 2px solid #1F1C18; padding-top: 18px")}><h3 style={css("font-size: 1.375rem")}>{w.t}</h3><p style={css("color: #5B5348")}>{w.d}</p></div></Fragment>))}</div>
<p className="lf-note lf-info" style={css("align-self: flex-start")}>{regLine}</p>
</div>
</section>

<section className="lf-sec" aria-labelledby="h-team" style={css("background: #ECE5DA")}>
<div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 28px")}>
<div style={css("display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px")}><div style={css("display: flex; flex-direction: column; gap: 10px")}><span className="lf-eyebrow">Our attorneys</span><h2 id="h-team" className="lf-sec-h">The people you will speak to</h2></div><Link className="lf-tlink" href={R.team}>Meet the team</Link></div>
<div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(min(160px, 44%), 1fr)); gap: 20px 14px")}>
{people.map((p, i) => (<Fragment key={i}><div style={css("display: flex; flex-direction: column; gap: 10px")}>
<div className="lf-portrait" style={css(`background: ${p.bg}`)}>{photos && (<><svg width="100%" height="100%" viewBox="0 0 100 125" preserveAspectRatio="xMidYMax meet" aria-hidden="true" style={css("position: absolute; inset: 0")}><circle cx="50" cy="48" r="19" fill="rgba(255,255,255,.55)"></circle><path d="M14 125c3-30 18-44 36-44s33 14 36 44z" fill="rgba(255,255,255,.55)"></path></svg><span className="lf-cap" style={css("position: relative")}>Sample portrait</span></>)}{noPhotos && (<><span className="lf-serif" aria-hidden="true" style={css("position: absolute; inset: 0; display: grid; place-items: center; font-size: 3rem; color: #1F1C18")}>{p.ini}</span><span className="lf-cap" style={css("position: relative")}>Photo to come</span></>)}</div>
<span style={css("display: flex; flex-direction: column")}><strong style={css("font-size: 1.0625rem")}>{p.n}</strong><span style={css("font-size: .9375rem; color: #5B5348")}>{p.r}</span></span></div></Fragment>))}
</div>
</div>
</section>

<section className="lf-sec" aria-labelledby="h-words">
<div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 28px")}>
<h2 id="h-words" className="lf-sec-h">In clients’ words</h2>
<div className="lf-grid">{words.map((r, i) => (<Fragment key={i}><figure className="lf-card" style={css("margin: 0; gap: 14px")}><span className="lf-tag">Sample, not a real client</span><blockquote className="lf-serif" style={css("margin: 0; font-size: 1.25rem; line-height: 1.45; font-weight: 500")}>“{r.q}”</blockquote><figcaption style={css("font-size: .9375rem; color: #5B5348")}>{r.w}</figcaption></figure></Fragment>))}</div>
<p className="lf-hint">We describe how we work, not how cases end. Every matter is different, and no attorney can promise a result.</p>
</div>
</section>
<CtaBand page="home" />
    </>
  );
}
