import { Fragment } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';

export default function SiteFooter() {
  const { tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after } = D;
  void [start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after, waShown, regLine];
  return (
<footer className="lf-dark" style={css("background: #1F1C18; color: #F7F4EF; padding: 56px 0 32px")}>
<div className="lf-wrap" style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 32px")}>
<div style={css("display: flex; flex-direction: column; gap: 8px")}><span className="lf-serif" style={css("font-size: 1.5rem")}>Ravell Ndaba Attorneys</span><span style={css("color: #CFC6B8; font-size: .9375rem")}>Plain advice, from people who pick up the phone.</span></div>
<div style={css("display: flex; flex-direction: column; gap: 6px; font-size: .9375rem")}><strong>Visit</strong><span style={css("color: #CFC6B8")}>[Street address]<br />Rosebank, Johannesburg</span><span style={css("color: #CFC6B8")}>Mon to Fri, 08:00 to 17:00</span></div>
<div style={css("display: flex; flex-direction: column; gap: 6px; font-size: .9375rem")}><strong>Contact</strong><a href={`tel:${tel}`} style={css("color: #F7F4EF")}>{telShown}</a><span style={css("color: #CFC6B8")}>[email address]</span></div>
<div style={css("display: flex; flex-direction: column; gap: 6px; font-size: .9375rem")}><strong>Urgent</strong><span style={css("color: #CFC6B8")}>Call {telShown}. If anyone is in danger, call 10111 or 112.</span></div>
</div>
<div className="lf-wrap" style={css("margin-top: 36px; padding-top: 20px; border-top: 1px solid rgba(247,244,239,.16); font-size: .875rem; color: #CFC6B8; display: flex; flex-direction: column; gap: 8px")}>
<span>[Admitted attorneys of the High Court of South Africa · LPC registration no.]</span>
<span style={css("display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px")}><span>© 2026 Ravell Ndaba Attorneys · a made-up firm for a byteleaf demo · [Privacy notice] · [PAIA manual]</span><span>Website by byteleaf (demo)</span></span>
</div>
</footer>
  );
}
