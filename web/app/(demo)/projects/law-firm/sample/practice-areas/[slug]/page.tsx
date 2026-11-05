import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CtaBand from '@/components/law/CtaBand';
import FamilyLaw from '@/components/law/FamilyLaw';
import { D } from '@/lib/law/content';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ photos?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = D.areas.find((x) => x.slug === slug);
  return { title: a ? a.n : 'Practice area' };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const area = D.areas.find((x) => x.slug === slug);
  if (!area) notFound();
  if (slug === 'family-law') {
    const q = await searchParams;
    return (<><FamilyLaw photos={q.photos !== 'false'} /><CtaBand page="area" /></>);
  }
  // The other five areas follow the same template; only family law is written out in full for the demo.
  return (
    <>
      <section style={css('padding: 48px 0 56px; background: #FFFFFF; border-bottom: 1px solid #DCD3C5')}>
        <div className="lf-wrap" style={css('display: flex; flex-direction: column; gap: 16px')}>
          <nav aria-label="Breadcrumb" style={css('font-size: .9375rem; color: #5B5348')}><Link className="lf-tlink" href={R.areas} style={css('font-weight: 400')}>Practice areas</Link> <span aria-hidden="true">/</span> {area.n}</nav>
          <h1 className="lf-hero-h" style={css('font-size: 3.5rem; font-weight: 500')}>{area.n}</h1>
          <p className="lf-lead" style={css('max-width: 40em')}>{area.q}</p>
          <div style={css('display: flex; flex-wrap: wrap; gap: 12px')}><Link className="lf-b lf-b-clay" href={R.contact}>Request a consultation</Link><a className="lf-b lf-b-line" href={`tel:${D.tel}`}>Call {D.telShown}</a></div>
        </div>
      </section>
      <section className="lf-sec">
        <div className="lf-wrap" style={css('display: flex; flex-direction: column; gap: 24px; max-width: 760px')}>
          <h2 style={css('font-size: 2rem')}>What we help with</h2>
          <ul style={css('margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px')}>{area.ex.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="lf-note lf-info">The full page for {area.n.toLowerCase()} follows the same layout as family law: how it usually goes, what to bring, typical costs, who you will work with and common questions. It is written out in full for family law in this demo.</p>
          <p style={css('color: #5B5348')}>Usually starts with: <strong style={css('color: #1F1C18')}>{area.first}</strong></p>
          <div><Link className="lf-b lf-b-line" href={R.guide('first-consultation')}>What a first consultation involves</Link></div>
        </div>
      </section>
      <CtaBand page="area" />
    </>
  );
}
