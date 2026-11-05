import { Fragment } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';
import ConsultationForm from '@/components/law/ConsultationForm';

export const metadata = { title: 'Contact and consultation' };

export default async function Page({ searchParams }: { searchParams: Promise<{ form?: string }> }) {
  const q = await searchParams;
  const { tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after } = D;
  void [tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after];
  return (
    <>
<section style={css("padding: 56px 0 72px")}><div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 32px")}>
<div style={css("display: flex; flex-direction: column; gap: 14px; max-width: 760px")}><span className="lf-eyebrow">Contact and consultation</span><h1 className="lf-hero-h" style={css("font-size: 3.25rem; font-weight: 500")}>Tell us briefly what’s happening.</h1><p className="lf-lead">An attorney reads every request. We reply within [reply time] on working days to book your first consultation.</p></div>
<div className="lf-note lf-urgent" role="note"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 16.5h.01"></path></svg><span><strong>Is it urgent?</strong> For an arrest, a court date in the next few days, or an interdict (an urgent court order), don’t use this form: call <a href={`tel:${tel}`}>{telShown}</a>. If anyone is in danger, call 10111 or 112.</span></div>
<div style={css("display: flex; flex-wrap: wrap; gap: 40px; align-items: flex-start")}>
<div style={css("flex: 1.5 1 480px; min-width: 0")}>
<ConsultationForm failFirst={q.form === 'fails'} />
</div>
<aside style={css("flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 20px")} aria-label="Other ways to reach us">
<div className="lf-card" style={css("gap: 14px")}><h2 style={css("font-size: 1.375rem")}>Call or message</h2>
<a className="lf-b lf-b-ink" href={`tel:${tel}`}>Call {telShown}</a><a className="lf-b lf-b-line" href="#">WhatsApp {waShown}</a>
<p className="lf-hint">Messages after hours are answered the next working morning.</p></div>
<div className="lf-card" style={css("padding: 0; overflow: hidden; gap: 0")}>
<svg viewBox="0 0 360 220" role="img" aria-label="Drawn map: the office is two blocks from Rosebank station, next to a small park" style={css("display: block; width: 100%; height: auto; background: #EFE9DF")}>
<rect x="0" y="0" width="360" height="220" fill="#EFE9DF"></rect>
<rect x="196" y="116" width="92" height="64" rx="6" fill="#D6DEC9"></rect>
<g stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round"><path d="M-10 60H370"></path><path d="M-10 150H370"></path><path d="M80 -10V230"></path><path d="M180 -10V230"></path><path d="M300 -10V230"></path></g>
<g stroke="#DCD3C5" strokeWidth="2"><path d="M-10 60H370M-10 150H370M80 -10V230M180 -10V230M300 -10V230" fill="none" strokeDasharray="0"></path></g>
<rect x="96" y="76" width="68" height="58" rx="5" fill="#E2D9CB"></rect><rect x="196" y="76" width="92" height="30" rx="5" fill="#E2D9CB"></rect><rect x="96" y="166" width="68" height="40" rx="5" fill="#E2D9CB"></rect><rect x="12" y="76" width="56" height="58" rx="5" fill="#E2D9CB"></rect>
<g transform="translate(32 26)"><rect x="-22" y="-12" width="44" height="24" rx="12" fill="#1F1C18"></rect><text x="0" y="5" textAnchor="middle" fontFamily="Source Sans 3, sans-serif" fontSize="12" fontWeight="600" fill="#FFFFFF">Train</text></g>
<text x="242" y="152" textAnchor="middle" fontFamily="Source Sans 3, sans-serif" fontSize="11" fill="#4A5A3E">Park</text>
<g transform="translate(130 100)"><path d="M0 -26c-10 0-17 7-17 17 0 12 17 27 17 27s17-15 17-27c0-10-7-17-17-17z" fill="#9C3D24"></path><circle cx="0" cy="-9" r="6" fill="#FFFFFF"></circle></g>
</svg>
<div style={css("padding: 20px 24px; display: flex; flex-direction: column; gap: 4px")}><strong>[Street address], Rosebank, Johannesburg</strong><span className="lf-hint">About [x] minutes’ walk from Rosebank station. Map drawn for the demo.</span></div></div>
<div className="lf-card" style={css("gap: 12px")}><dl style={css("margin: 0; display: flex; flex-direction: column; gap: 12px")}>
<div><dt style={css("font-weight: 600")}>Hours</dt><dd style={css("margin: 0; color: #5B5348")}>Monday to Friday, 08:00 to 17:00</dd></div>
<div><dt style={css("font-weight: 600")}>Parking</dt><dd style={css("margin: 0; color: #5B5348")}>Visitor bays in the basement. Tell security you are visiting us. [Confirm bay details]</dd></div>
<div><dt style={css("font-weight: 600")}>Email</dt><dd style={css("margin: 0; color: #5B5348")}>[email address]</dd></div>
</dl></div>
</aside>
</div>
</div></section>
    </>
  );
}
