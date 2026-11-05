import { Fragment } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';



export default function GuideDyingWithoutWill() {
  const { tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after } = D;
  void [tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after];
  return (
    <>
<article>
<header style={css("padding: 56px 0 40px; background: #FFFFFF; border-bottom: 1px solid #DCD3C5")}><div className="lf-wrap"><div style={css("max-width: 780px; display: flex; flex-direction: column; gap: 18px")}>
<nav aria-label="Breadcrumb" style={css("font-size: .9375rem; color: #5B5348")}><Link className="lf-tlink" href={R.insights} style={css("font-weight: 400")}>Insights</Link> <span aria-hidden="true">/</span> Wills and estates</nav>
<h1 className="lf-hero-h" style={css("font-size: 3.25rem; font-weight: 500")}>What happens when someone dies without a will</h1>
<p className="lf-lead">Who inherits, who sorts out the estate, and what the family needs to do in the first weeks.</p>
<div style={css("display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; font-size: .9375rem; color: #5B5348")}><span style={css("display: flex; align-items: center; gap: 10px")}><span className="lf-serif" aria-hidden="true" style={css("width: 40px; height: 40px; border-radius: 50%; background: #E9C9B9; display: grid; place-items: center; color: #1F1C18")}>NN</span><span><strong style={css("color: #1F1C18")}>Naledi Ndaba</strong>, founding partner</span></span><span>12 October 2026</span><span>7 minute read</span></div>
</div></div></header>
<div className="lf-wrap" style={css("padding-top: 40px; padding-bottom: 72px")}>
<div className="lf-prose">
<div className="lf-note lf-info" role="note" style={css("font-size: 1rem")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 7.5h.01"></path></svg><span><strong>General information, not legal advice.</strong> Every family and estate is different. For advice on yours, <Link className="lf-tlink" href={R.contact}>request a consultation</Link>.</span></div>
<p>When someone dies without a valid will, the law decides who inherits. This is called <strong>intestate succession</strong> (passing on an estate when there is no will). The rules are fixed, and they do not take into account what the person might have wanted, or who they lived with.</p>
<p>That surprises many families. A long-term partner who was never married to the person may receive nothing. Children from an earlier relationship inherit in the same way as children from the current one. And everything waits until the estate has been reported and an executor appointed.</p>
<h2>Who inherits</h2>
<p>This is a simplified summary of the general rules. Your family’s situation may change who inherits and how much.</p>
<div className="lf-tw" role="region" aria-label="Who inherits when there is no will" tabIndex={0}><div role="table" className="lf-gt" style={css("min-width: 520px; --cols: 1fr 1.6fr")}><div role="row" className="lf-gr lf-gh"><span role="columnheader">Who survives the person</span><span role="columnheader">Who inherits</span></div>{intestate.map((r, i) => (<Fragment key={i}><div role="row" className="lf-gr"><span role="cell">{r.a}</span><span role="cell">{r.b}</span></div></Fragment>))}</div></div>
<p>If one of the person’s children died before them, that child’s own children usually inherit their parent’s share.</p>
<blockquote style={css("margin: 12px 0; padding: 8px 0 8px 28px; border-left: 4px solid #9C3D24")}><p className="lf-serif" style={css("font-size: 1.75rem; line-height: 1.35; font-weight: 500")}>The law decides who inherits, not the family, and not what the person said they wanted.</p></blockquote>
<h2>What the family needs to do</h2>
<ol>
<li><strong>Report the death to the Master of the High Court</strong> (the office that oversees deceased estates), usually within 14 days. One family member can do this.</li>
<li><strong>Gather the papers:</strong> the death certificate, ID documents, the marriage certificate if there was one, and a list of what the person owned and owed.</li>
<li><strong>An executor is appointed.</strong> This is the person who manages the estate, pays the debts and hands over what is left. Without a will, the Master appoints one, often a family member with an attorney’s help.</li>
<li><strong>The estate is wound up.</strong> Debts and taxes are paid, an account is advertised so people can check it, and the inheritance is paid out.</li>
</ol>
<p>Smaller estates, [below the current threshold], can follow a simpler process. We will tell you at the first meeting whether yours qualifies.</p>
<h2>Surprises we see often</h2>
<ul>
<li>Bank accounts in the person’s name are frozen until the executor is appointed. Plan for funeral and living costs.</li>
<li>A house cannot be sold or transferred until the estate is wound up, which can take [typical time].</li>
<li>A customary marriage counts as a marriage for inheritance, if it can be proved.</li>
</ul>
<h2>How to avoid this for your own family</h2>
<p>A valid will lets you choose who inherits, name your executor and appoint a guardian for young children. It takes about an hour with us and costs a fixed fee of R [amount].</p>
<div className="lf-card" style={css("background: #1F1C18; color: #FFFFFF; border: 0; padding: 28px; gap: 14px; margin-top: 12px")}><h2 className="lf-dark" style={css("font-size: 1.5rem; margin: 0")}>Dealing with an estate right now?</h2><p style={css("color: #E6DFD3; font-size: 1.0625rem")}>We can help you report it, act as or assist the executor, and explain each step as it happens.</p><span className="lf-dark"><Link className="lf-b lf-b-light" href={R.contact}>Request a consultation</Link></span></div>
<p className="lf-hint" style={css("border-top: 1px solid #DCD3C5; padding-top: 18px")}>This guide is general information about South African law as at its date, simplified for reading. It is not legal advice and does not create an attorney-client relationship. Amounts in [square brackets] are confirmed by the firm before launch.</p>
</div>
</div>
</article>
    </>
  );
}
