import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';
import CtaBand from '@/components/law/CtaBand';

export const metadata = { title: 'Attorneys' };

export default async function Page({ searchParams }: { searchParams: Promise<{ photos?: string }> }) {
  const q = await searchParams;
  const photos = q.photos !== 'false';
  const noPhotos = !photos;
  const { tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after } = D;
  void [tel, telShown, waShown, regLine, start, areas, why, people, words, flHelp, flBring, flCost, flFaq, charge, rates, meet, next, promise, intestate, lost, after];
  return (
    <>
<section style={css("padding: 64px 0 32px")}><div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 16px")}><span className="lf-eyebrow">Our attorneys</span><h1 className="lf-hero-h" style={css("font-size: 3.5rem; font-weight: 500")}>Five people. You’ll know who is handling your matter.</h1><p className="lf-lead">Every matter has one attorney responsible for it from start to finish, and you will have their direct number.</p></div></section>
<section style={css("padding: 16px 0 72px")}><div className="lf-wrap" style={css("display: flex; flex-direction: column; gap: 20px")}>
{people.map((p, i) => (<Fragment key={i}><article className="lf-card" style={css("flex-direction: row; flex-wrap: wrap; gap: 24px 36px; padding: 28px; align-items: flex-start")}>
<div className="lf-portrait" style={css(`flex: 0 0 200px; max-width: 100%; background: ${p.bg}`)}>{photos && (<><Image src={p.img} alt="" fill sizes="200px" quality={92} style={{ objectFit: 'cover' }} /><span className="lf-cap" style={css("position: relative")}>Illustrated portrait</span></>)}{noPhotos && (<><span className="lf-serif" aria-hidden="true" style={css("position: absolute; inset: 0; display: grid; place-items: center; font-size: 3.5rem")}>{p.ini}</span><span className="lf-cap" style={css("position: relative")}>Photo to come</span></>)}</div>
<div style={css("flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 12px")}>
<div style={css("display: flex; flex-direction: column; gap: 4px")}><h2 style={css("font-size: 1.875rem")}>{p.n}</h2><span style={css("color: #9C3D24; font-weight: 600")}>{p.r}</span></div>
<p style={css("max-width: 60ch")}>{p.bio}</p>
<dl style={css("margin: 4px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr)); gap: 12px 24px; font-size: 1rem")}>
<div><dt style={css("font-weight: 600")}>Works on</dt><dd style={css("margin: 0; color: #5B5348")}>{p.areas}</dd></div>
<div><dt style={css("font-weight: 600")}>Languages</dt><dd style={css("margin: 0; color: #5B5348")}>{p.lang}</dd></div>
<div><dt style={css("font-weight: 600")}>Admitted</dt><dd style={css("margin: 0; color: #5B5348")}>{p.adm}</dd></div>
</dl>
</div>
</article></Fragment>))}
<p className="lf-note lf-info" style={css("align-self: flex-start")}>{regLine}</p>
</div></section>
<CtaBand page="team" />
    </>
  );
}
