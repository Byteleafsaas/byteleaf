import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';
import AreaSteps from '@/components/law/AreaSteps';



export default function FamilyLaw({ photos }: { photos: boolean }) {
  const noPhotos = !photos;
  const { tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after } = D;
  void [tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after];
  return (
    <>
<section style={css("padding: 48px 0 40px; background: #FFFFFF; border-bottom: 1px solid #DCD3C5")}><div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 16px")}>
<nav aria-label="Breadcrumb" style={css("font-size: .9375rem; color: #5B5348")}><Link className="lf-tlink" href={R.areas} style={css("font-weight: 400")}>Practice areas</Link> <span aria-hidden="true">/</span> Family law and divorce</nav>
<h1 className="lf-hero-h" style={css("font-size: 3.5rem; font-weight: 500")}>Family law and divorce</h1>
<p className="lf-lead" style={css("max-width: 40em")}>Divorce, maintenance and arrangements for your children. We help you understand your options, agree where you can, and go to court only when you must.</p>
<div style={css("display: flex; flex-wrap: wrap; gap: 12px")}><Link className="lf-b lf-b-clay" href={R.contact}>Request a consultation</Link><a className="lf-b lf-b-line" href={`tel:${tel}`}>Call {telShown}</a></div>
</div></section>
<div className="lf-wrap" style={css("display: flex; gap: 56px; align-items: flex-start; padding-top: 48px; padding-bottom: 72px")}>
<aside className="lf-side" aria-label="On this page" style={css("flex: 0 0 220px; position: sticky; top: 140px; display: flex; flex-direction: column; gap: 8px")}><span className="lf-eyebrow" style={css("color: #5B5348")}>On this page</span><nav className="lf-toc"><a href="#fl-help">What we help with</a><a href="#fl-how">How it usually goes</a><a href="#fl-bring">What to bring</a><a href="#fl-cost">Typical costs</a><a href="#fl-who">Who you’ll work with</a><a href="#fl-q">Questions</a></nav></aside>
<div style={css("flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 56px")}>
<section id="fl-help" style={css("display: flex; flex-direction: column; gap: 18px; scroll-margin-top: 140px")}><h2 style={css("font-size: 2rem")}>What we help with</h2>
<div className="lf-grid" style={css("grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr))")}>{flHelp.map((h, i) => (<Fragment key={i}><div className="lf-card" style={css("gap: 6px")}><h3 style={css("font-size: 1.1875rem")}>{h.t}</h3><p style={css("color: #5B5348; font-size: 1rem")}>{h.d}</p></div></Fragment>))}</div>
<div className="lf-note lf-urgent"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 16.5h.01"></path></svg><span><strong>If you or your children are in danger now,</strong> call 10111 or 112 first. Then call us on <a href={`tel:${tel}`}>{telShown}</a> about a protection order (a court order that stops someone from harming or contacting you).</span></div>
</section>
<AreaSteps />
<section id="fl-bring" style={css("display: flex; flex-direction: column; gap: 18px; scroll-margin-top: 140px")}><h2 style={css("font-size: 2rem")}>What to bring to your first meeting</h2>
<ul style={css("list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 10px 24px")}>{flBring.map((b, i) => (<Fragment key={i}><li style={css("display: flex; gap: 12px; align-items: flex-start")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9C3D24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={css("flex: none; margin-top: 2px")}><path d="M5 12l5 5L20 7"></path></svg><span>{b}</span></li></Fragment>))}</ul>
<p className="lf-hint">Bring originals to the meeting. Please don’t email ID documents before we have spoken.</p>
</section>
<section id="fl-cost" style={css("display: flex; flex-direction: column; gap: 18px; scroll-margin-top: 140px")}><h2 style={css("font-size: 2rem")}>Typical costs</h2>
<div className="lf-tw" role="region" aria-label="Typical family law costs" tabIndex={0}><div role="table" className="lf-gt" style={css("min-width: 560px; --cols: 1.3fr 1.5fr 1fr")}><div role="row" className="lf-gr lf-gh"><span role="columnheader">Work</span><span role="columnheader">How it’s charged</span><span role="columnheader">Guide price</span></div>{flCost.map((c, i) => (<Fragment key={i}><div role="row" className="lf-gr"><span role="cell">{c.w}</span><span role="cell">{c.h}</span><span role="cell">{c.p}</span></div></Fragment>))}</div></div>
<p className="lf-hint">You get a written estimate before any chargeable work starts. <Link className="lf-tlink" href={R.fees}>How our fees work</Link></p>
</section>
<section id="fl-who" style={css("display: flex; flex-direction: column; gap: 18px; scroll-margin-top: 140px")}><h2 style={css("font-size: 2rem")}>Who you’ll work with</h2>
<div className="lf-card" style={css("flex-direction: row; flex-wrap: wrap; gap: 20px; align-items: center")}><div className="lf-portrait" style={css("width: 120px; flex: none; background: #E9C9B9")}>{photos && (<><Image src={D.people[0].img} alt="" fill sizes="120px" quality={92} style={{ objectFit: 'cover' }} /></>)}{noPhotos && (<><span className="lf-serif" aria-hidden="true" style={css("position: absolute; inset: 0; display: grid; place-items: center; font-size: 2.25rem")}>NN</span></>)}</div><div style={css("flex: 1 1 260px; display: flex; flex-direction: column; gap: 6px")}><strong style={css("font-size: 1.25rem")}>Naledi Ndaba</strong><span style={css("color: #5B5348")}>Founding partner · family law and estates · admitted [year]</span><span style={css("color: #5B5348")}>Speaks English, isiZulu and Sesotho</span><Link className="lf-tlink" href={R.team} style={css("margin-top: 4px")}>About Naledi and the team</Link></div></div>
</section>
<section id="fl-q" style={css("display: flex; flex-direction: column; gap: 8px; scroll-margin-top: 140px")}><h2 style={css("font-size: 2rem; margin-bottom: 10px")}>Questions people ask</h2>
<div style={css("border-bottom: 1px solid #DCD3C5")}>{flFaq.map((f, i) => (<Fragment key={i}><details className="lf-fq"><summary>{f.q}</summary><p style={css("margin: 0 0 18px; color: #5B5348; max-width: 62ch")}>{f.a}</p></details></Fragment>))}</div>
</section>
</div>
</div>
    </>
  );
}
