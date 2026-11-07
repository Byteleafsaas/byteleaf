'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { BASE } from '@/lib/law/routes';
import { SC } from '@/lib/law/showcase';
import './stage.css';

type Key = keyof typeof SC.pages;

export default function Stage() {
  const [page, setPage] = useState<Key>('home');
  const [co, setCo] = useState(0);
  const p = SC.pages[page];
  const tabs = SC.order.map((k) => ({ l: SC.pages[k].l, on: page === k, pick: () => { setPage(k); setCo(-1); } }));
  const callouts = SC.callouts.map((c, i) => ({ ...c, on: co === i, pick: () => { setCo(i); setPage(c.page); } }));
  const stageLabel = 'Sample site, ' + p.l + ' page';
  const phoneLabel = 'Phone drawing of the ' + p.l + ' page';
  const path = p.path, eyebrow = p.eyebrow, title = p.title, lead = p.lead, titleSize = p.size, pTitleSize = p.psize;
  const hasCrumb = false, crumb = '';
  const mnav = ['Practice areas', 'Attorneys', 'Fees', 'Insights', 'Contact'].map((l) => ({ l, st: l === p.nav ? 'box-shadow: inset 0 -2px 0 #9C3D24; padding-bottom: 3px' : '' }));
  const isHome = page === 'home';
  const bCards = p.b === 'cards', bPeople = p.b === 'people', bSteps = p.b === 'steps', bFees = p.b === 'fees', bProse = p.b === 'prose', bForm = p.b === 'form';
  const { cards, people, steps, charge, rates } = SC;
  const pList = SC.pList[page];
  const pin1 = co === 0, pin2 = co === 1 && page === 'fees', pin3 = co === 2 && page === 'insights';
  const btnCls = co === 0 ? 'ld-mb ld-ring' : 'ld-mb', pBtnCls = btnCls;
  const caption = co >= 0 ? SC.callouts[co].n + ' · ' + SC.callouts[co].t + '. ' + SC.captions[page] : SC.captions[page];
  void [tabs, callouts, Link, Fragment, BASE];
  return (
    <>
<div style={css("display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px")}>
<div role="tablist" aria-label="Pages of the sample site" className="ld-ptabs">{tabs.map((t, i) => (<Fragment key={i}><button type="button" role="tab" className="ld-ptab" aria-selected={t.on} aria-controls="lf-stage" onClick={t.pick}>{t.l}</button></Fragment>))}</div>
<a className="btn btn-primary btn-sm" href={BASE}>Open the full site<svg className="arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"></path></svg></a>
</div>

<div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 10px")} role="group" aria-label="What makes it work">
{callouts.map((c, i) => (<Fragment key={i}><button type="button" className="ld-co" aria-pressed={c.on} onClick={c.pick}><span className="ld-n" aria-hidden="true">{c.n}</span><span style={css("display: flex; flex-direction: column; gap: 2px")}><strong style={css("font-size: 15px")}>{c.t}</strong><span style={css("font-size: 14px; line-height: 1.5; color: #4B5872")}>{c.d}</span></span></button></Fragment>))}
</div>

<div id="lf-stage" role="tabpanel" aria-label={stageLabel} style={css("border-radius: 24px; background: #EEF2F8; padding: clamp(14px, 3vw, 32px)")}>
<div className="ld-stage-site" style={css("display: flex; gap: 28px; align-items: flex-start; justify-content: center")}>

<div className="ld-frame ld-bframe" style={css("flex: 1 1 680px; min-width: 0")}>
<div className="ld-chrome" aria-hidden="true"><i></i><i></i><i></i><span className="ld-url">[ravellndaba.co.za]{path}</span></div>
<div className="ld-mf" style={css("height: 540px; overflow: hidden")}>
<div style={css("background: #1F1C18; color: #F7F4EF; font-size: 9px; text-align: center; padding: 4px")}>Demo site by byteleaf · fictional law firm</div>
<div style={css("display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 22px; border-bottom: 1px solid #DCD3C5; position: relative")}>
<span style={css("display: flex; align-items: center; gap: 7px")}><span aria-hidden="true" style={css("width: 20px; height: 20px; border-radius: 5px; background: #9C3D24; color: #FFFFFF; display: grid; place-items: center; font-size: 11px; font-weight: 600")}>R</span><span className="ld-s" style={css("font-size: 15px; font-weight: 600")}>Ravell Ndaba</span></span>
<span style={css("display: flex; gap: 12px; align-items: center; font-size: 11px; font-weight: 600")}>{mnav.map((n, i) => (<Fragment key={i}><span style={css(`${n.st}`)}>{n.l}</span></Fragment>))}<span className={btnCls} style={css("background: #9C3D24; color: #FFFFFF")}>Request a consultation</span></span>
{pin1 && (<><span className="ld-pin" aria-hidden="true" style={css("right: 6px; top: 34px")}>1</span></>)}
</div>
<div style={css("padding: 22px 22px 0; display: flex; flex-direction: column; gap: 10px; position: relative")}>
{hasCrumb && (<><span style={css("font-size: 10px; color: #5B5348")}>{crumb}</span></>)}
<span style={css("font-size: 9px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #9C3D24")}>{eyebrow}</span>
<span className="ld-s" style={css(`font-size: ${titleSize}; max-width: 560px`)}>{title}</span>
<span style={css("font-size: 12px; line-height: 1.55; color: #5B5348; max-width: 470px")}>{lead}</span>
{isHome && (<><span style={css("display: flex; gap: 8px")}><span className="ld-mb" style={css("background: #9C3D24; color: #FFFFFF")}>Request a consultation</span><span className="ld-mb" style={css("box-shadow: inset 0 0 0 1.2px #1F1C18")}>Call [phone number]</span></span></>)}
</div>
<div style={css("padding: 16px 22px; position: relative")}>
{pin2 && (<><span className="ld-pin" aria-hidden="true" style={css("left: 4px; top: 4px")}>2</span></>)}
{pin3 && (<><span className="ld-pin" aria-hidden="true" style={css("left: 4px; top: 4px")}>3</span></>)}
{bCards && (<><div style={css("display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px")}>{cards.map((c, i) => (<Fragment key={i}><span className="ld-mc"><strong className="ld-s" style={css("font-size: 13px; font-weight: 600")}>{c.t}</strong><span style={css("color: #5B5348")}>{c.d}</span></span></Fragment>))}</div></>)}
{bPeople && (<><div style={css("display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px")}>{people.map((p, i) => (<Fragment key={i}><span style={css("display: flex; flex-direction: column; gap: 4px; font-size: 10px")}><span style={css(`aspect-ratio: 4 / 5; border-radius: 7px; background: ${p.bg}; display: grid; place-items: center; font-family: Fraunces, Georgia, serif; font-size: 18px`)}>{p.ini}</span><strong style={css("font-size: 11px")}>{p.n}</strong><span style={css("color: #5B5348")}>{p.r}</span></span></Fragment>))}</div></>)}
{bSteps && (<><div style={css("display: flex; gap: 18px")}><div style={css("flex: 0 0 120px; display: flex; flex-direction: column; gap: 6px; font-size: 10px; color: #5B5348; border-left: 2px solid #DCD3C5; padding-left: 8px")}><span style={css("color: #1F1C18; font-weight: 600")}>On this page</span><span>What we help with</span><span>How it usually goes</span><span>What to bring</span><span>Typical costs</span></div><div style={css("flex: 1; display: flex; flex-direction: column; gap: 9px")}>{steps.map((s, i) => (<Fragment key={i}><span style={css("display: flex; gap: 9px; align-items: flex-start; font-size: 11px")}><span style={css("flex: none; width: 20px; height: 20px; border-radius: 50%; background: #1F1C18; color: #FFFFFF; display: grid; place-items: center; font-size: 10px")}>{s.n}</span><span><strong>{s.t}</strong><br /><span style={css("color: #5B5348")}>{s.d}</span></span></span></Fragment>))}</div></div></>)}
{bFees && (<><div style={css("display: flex; flex-direction: column; gap: 8px")}><div style={css("display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px")}>{charge.map((c, i) => (<Fragment key={i}><span className="ld-mc"><span style={css("font-size: 8px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #5B5348")}>{c.k}</span><strong className="ld-s" style={css("font-size: 13px; font-weight: 600")}>{c.t}</strong><span className="ld-s" style={css("font-size: 14px; margin-top: 4px")}>{c.p}</span></span></Fragment>))}</div><div style={css("border: 1px solid #DCD3C5; border-radius: 9px; overflow: hidden; background: #FFFFFF; font-size: 10px")}>{rates.map((r, i) => (<Fragment key={i}><span style={css(`display: grid; grid-template-columns: 1.3fr 1.4fr 1fr; padding: 6px 10px; border-top: 1px solid #DCD3C5; ${r.st}`)}><strong>{r.a}</strong><span>{r.b}</span><span>{r.c}</span></span></Fragment>))}</div></div></>)}
{bProse && (<><div style={css("max-width: 430px; display: flex; flex-direction: column; gap: 9px; font-size: 12px; line-height: 1.65")}><span style={css("padding: 8px 10px; border-radius: 8px; background: #ECE5DA; font-size: 10.5px")}><strong>General information, not legal advice.</strong> For your situation, request a consultation.</span><span>When someone dies without a valid will, the law decides who inherits. This is called <strong>intestate succession</strong> (passing on an estate when there is no will).</span><span style={css("border-left: 3px solid #9C3D24; padding-left: 10px")} className="ld-s"><span style={css("font-size: 15px")}>The law decides who inherits, not the family.</span></span><span className="ld-s" style={css("font-size: 15px; font-weight: 600")}>Who inherits</span><span style={css("border: 1px solid #DCD3C5; border-radius: 8px; overflow: hidden; background: #FFFFFF; font-size: 10px")}><span style={css("display: grid; grid-template-columns: 1fr 1.5fr; padding: 5px 8px; background: #ECE5DA; font-weight: 600")}><span>WHO SURVIVES</span><span>WHO INHERITS</span></span><span style={css("display: grid; grid-template-columns: 1fr 1.5fr; padding: 5px 8px; border-top: 1px solid #DCD3C5")}><strong>A spouse, no children</strong><span>The spouse inherits everything.</span></span><span style={css("display: grid; grid-template-columns: 1fr 1.5fr; padding: 5px 8px; border-top: 1px solid #DCD3C5")}><strong>Children, no spouse</strong><span>The children share equally.</span></span></span></div></>)}
{bForm && (<><div style={css("display: flex; gap: 14px; align-items: flex-start")}><div style={css("flex: 1.5; display: flex; flex-direction: column; gap: 8px")}><span style={css("padding: 7px 10px; border-radius: 8px; background: #FCEBE5; color: #6E2414; font-size: 10.5px")}><strong>Is it urgent?</strong> Don’t use this form: call the firm. If anyone is in danger, call 10111 or 112.</span><span className="ld-mc" style={css("gap: 7px")}><strong className="ld-s" style={css("font-size: 14px; font-weight: 600")}>Request a consultation</strong><span style={css("display: grid; grid-template-columns: 1fr 1fr; gap: 6px")}><span style={css("height: 22px; border: 1px solid #867B6D; border-radius: 5px")}></span><span style={css("height: 22px; border: 1px solid #867B6D; border-radius: 5px")}></span></span><span style={css("height: 40px; border: 1px solid #867B6D; border-radius: 5px")}></span><span style={css("color: #5B5348; font-size: 9.5px")}>Please don’t send ID numbers or documents here.</span><span style={css("display: flex; gap: 6px; align-items: center; font-size: 10px")}><span style={css("width: 11px; height: 11px; border: 1.2px solid #867B6D; border-radius: 2px")}></span>I agree that the firm may contact me</span><span className="ld-mb" style={css("align-self: flex-start; background: #9C3D24; color: #FFFFFF")}>Request a consultation</span></span></div><div style={css("flex: 1; display: flex; flex-direction: column; gap: 8px")}><span className="ld-mc"><strong>Call or message</strong><span className="ld-mb" style={css("background: #1F1C18; color: #FFFFFF")}>Call [phone number]</span></span><span className="ld-mc" style={css("padding: 0; overflow: hidden")}><span style={css("height: 70px; background: linear-gradient(90deg, transparent 46%, #FFFFFF 46%, #FFFFFF 50%, transparent 50%), linear-gradient(0deg, transparent 46%, #FFFFFF 46%, #FFFFFF 54%, transparent 54%), #EFE9DF; position: relative; display: block")}><span style={css("position: absolute; left: 30%; top: 25%; width: 12px; height: 12px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #9C3D24")}></span></span><span style={css("padding: 6px 10px")}>[Street address], Rosebank</span></span></div></div></>)}
</div>
</div>
</div>

<div className="ld-phone" role="img" aria-label={phoneLabel}>
<div className="ld-scr ld-mf" aria-hidden="true">
<div style={css("display: flex; justify-content: space-between; align-items: center; padding: 24px 14px 8px; border-bottom: 1px solid #DCD3C5")}><span style={css("display: flex; align-items: center; gap: 6px")}><span style={css("width: 18px; height: 18px; border-radius: 5px; background: #9C3D24; color: #FFFFFF; display: grid; place-items: center; font-size: 10px; font-weight: 600")}>R</span><span className="ld-s" style={css("font-size: 14px; font-weight: 600")}>Ravell Ndaba</span></span><span className="ld-mb" style={css("min-height: 24px; font-size: 10px; box-shadow: inset 0 0 0 1.2px #1F1C18")}>Menu</span></div>
<div style={css("flex: 1; overflow: hidden; padding: 16px 14px; display: flex; flex-direction: column; gap: 9px")}>
<span style={css("font-size: 8px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #9C3D24")}>{eyebrow}</span>
<span className="ld-s" style={css(`font-size: ${pTitleSize}`)}>{title}</span>
<span style={css("font-size: 11.5px; line-height: 1.55; color: #5B5348")}>{lead}</span>
{bForm && (<><span style={css("padding: 7px 9px; border-radius: 8px; background: #FCEBE5; color: #6E2414; font-size: 10px")}><strong>Is it urgent?</strong> Call the firm. If anyone is in danger, call 10111 or 112.</span></>)}
{pList.map((c, i) => (<Fragment key={i}><span className="ld-mc"><strong className="ld-s" style={css("font-size: 12.5px; font-weight: 600")}>{c.t}</strong><span style={css("color: #5B5348")}>{c.d}</span></span></Fragment>))}
</div>
<div style={css("display: flex; gap: 6px; padding: 8px; border-top: 1px solid #DCD3C5; background: #F7F4EF; position: relative")}><span className="ld-mb" style={css("flex: 1; min-height: 32px; box-shadow: inset 0 0 0 1.2px #1F1C18")}>Call</span><span className={pBtnCls} style={css("flex: 2.2; min-height: 32px; background: #9C3D24; color: #FFFFFF")}>Request a consultation</span></div>
</div>
</div>
</div>
</div>
<p aria-live="polite" style={css("margin: 0; font-size: 16px; line-height: 1.5; color: #0B1220; min-height: 24px")}>{caption}</p>
    </>
  );
}
