'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { css } from '@/lib/law/css';
import { R, BASE } from '@/lib/law/routes';
import { D } from '@/lib/law/content';

const PAGES = [['Practice areas', R.areas], ['Attorneys', R.team], ['Fees', R.fees], ['Insights', R.insights], ['Contact', R.contact]] as const;

export default function SiteHeader() {
  const path = usePathname() ?? '';
  const [menu, setMenu] = useState(false);
  const { tel, telShown } = D;
  useEffect(() => setMenu(false), [path]);
  const isCur = (href: string) => (href === BASE ? path === BASE : path === href || path.startsWith(href + '/'));
  const nav = PAGES.map(([l, href]) => ({ l, href, cur: isCur(href) ? ('page' as const) : undefined }));
  const navM = [{ l: 'Home', href: R.home, cur: path === BASE ? ('page' as const) : undefined }, ...nav];
  return (
    <header style={css('position: sticky; top: 0; z-index: 20; background: rgba(247,244,239,.97); border-bottom: 1px solid #DCD3C5')}>
<div className="lf-wrap lf-util" style={css("display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 4px 24px; padding-top: 8px; font-size: .9375rem; color: #5B5348")}>
<span>Mon to Fri, 08:00 to 17:00</span>
<span><a href={`tel:${tel}`} style={css("color: #1F1C18")}>{telShown}</a></span>
<span><strong style={css("color: #6E2414")}>Urgent?</strong> <Link className="lf-tlink" href={R.contact} style={css("font-weight: 400; color: #6E2414")}>What to do now</Link></span>
</div>
<div className="lf-wrap" style={css("display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; min-height: 76px; padding-block: 6px")}>
<Link href={R.home} aria-label="Ravell Ndaba Attorneys, home" style={css("text-decoration: none; font: inherit; cursor: pointer; border: 0; background: transparent; padding: 4px 0; display: flex; align-items: center; gap: 12px; color: #1F1C18; text-align: left")}>
<svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true" style={css("flex: none")}><rect width="38" height="38" rx="9" fill="#9C3D24"></rect><path d="M11 27V11h7.5a5 5 0 0 1 0 10H11m7.5 0L26 27" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"></path></svg>
<span style={css("display: flex; flex-direction: column; line-height: 1.05")}><span className="lf-serif" style={css("font-size: 1.375rem")}>Ravell Ndaba</span><span style={css("font-size: .6875rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: #5B5348; margin-top: 3px; white-space: nowrap")}>Attorneys<span className="lf-loc"> · Rosebank</span></span></span>
</Link>
<nav className="lf-dnav" aria-label="Main" style={css("display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 2px")}>
{nav.map((n, i) => (<Fragment key={i}><Link className="lf-nl" aria-current={n.cur} href={n.href}>{n.l}</Link></Fragment>))}
<Link className="lf-b lf-b-clay" href={R.contact} style={css("min-height: 46px; margin-left: 12px")}>Request a consultation</Link>
</nav>
<div className="lf-mnav" style={css("align-items: center; gap: 8px; margin-left: auto")}>
<a className="lf-b lf-b-line" href={`tel:${tel}`} aria-label="Call the firm" style={css("min-height: 44px; width: 44px; padding: 0")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"></path></svg></a>
<button type="button" className="lf-b lf-b-line" aria-expanded={menu} aria-controls="mmenu" onClick={() => setMenu((m) => !m)} style={css("min-height: 44px; padding: 0 16px; font-size: 1rem")}>{menu ? 'Close' : 'Menu'}</button>
</div>
</div>
{menu && (<>
<nav id="mmenu" aria-label="Main" style={css("border-top: 1px solid #DCD3C5; background: #F7F4EF; padding: 8px 16px 20px; display: flex; flex-direction: column; gap: 12px")}>
<div style={css("display: flex; flex-direction: column")}>{navM.map((n, i) => (<Fragment key={i}><Link className="lf-nl" aria-current={n.cur} href={n.href} style={css("text-align: left; min-height: 56px; font-size: 1.1875rem; border-bottom: 1px solid #DCD3C5; border-radius: 0; white-space: normal")}>{n.l}</Link></Fragment>))}</div>
<div className="lf-note lf-urgent"><span><strong>Urgent?</strong> An arrest, a court deadline or a threat to safety: call <a href={`tel:${tel}`}>{telShown}</a>. If you are in danger, call 10111 or 112.</span></div>
</nav>
</>)}
    </header>
  );
}
