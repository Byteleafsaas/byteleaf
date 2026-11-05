import { Fragment } from 'react';
import Link from 'next/link';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';
import { D } from '@/lib/law/content';

type Page = keyof typeof D.cta;

export default function CtaBand({ page }: { page: Page }) {
  const { tel, telShown } = D;
  const [ctaTitle, ctaText] = D.cta[page];
  return (
<section className="lf-dark" aria-labelledby="cta" style={css("padding: 64px 0; background: #9C3D24; color: #FFFFFF")}>
<div className="lf-wrap" style={css("display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 24px")}>
<div style={css("display: flex; flex-direction: column; gap: 8px; max-width: 34em")}><h2 id="cta" style={css("font-size: 2.25rem; font-weight: 500")}>{ctaTitle}</h2><p style={css("color: #F8E5DD")}>{ctaText}</p></div>
<span style={css("display: flex; flex-wrap: wrap; gap: 12px")}><Link className="lf-b lf-b-light" href={R.contact}>Request a consultation</Link><a className="lf-b" href={`tel:${tel}`} style={css("color: #FFFFFF; box-shadow: inset 0 0 0 1.5px #FFFFFF")}>Call {telShown}</a></span>
</div>
</section>
  );
}
