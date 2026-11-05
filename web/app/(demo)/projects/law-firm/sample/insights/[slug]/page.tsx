import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CtaBand from '@/components/law/CtaBand';
import GuideDyingWithoutWill from '@/components/law/GuideDyingWithoutWill';
import { D } from '@/lib/law/content';
import { css } from '@/lib/law/css';
import { R } from '@/lib/law/routes';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = D.guides.find((x) => x.slug === slug);
  return { title: g ? g.t : 'Guide' };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const g = D.guides.find((x) => x.slug === slug);
  if (!g) notFound();
  if (slug === 'dying-without-a-will') return (<><GuideDyingWithoutWill /><CtaBand page="article" /></>);
  // Only one guide is written out in full for the demo; the others show their heading and a note.
  return (
    <>
      <article>
        <header style={css('padding: 56px 0 40px; background: #FFFFFF; border-bottom: 1px solid #DCD3C5')}>
          <div className="lf-wrap"><div style={css('max-width: 780px; display: flex; flex-direction: column; gap: 18px')}>
            <nav aria-label="Breadcrumb" style={css('font-size: .9375rem; color: #5B5348')}><Link className="lf-tlink" href={R.insights} style={css('font-weight: 400')}>Insights</Link> <span aria-hidden="true">/</span> {g.topic}</nav>
            <h1 className="lf-hero-h" style={css('font-size: 3.25rem; font-weight: 500')}>{g.t}</h1>
            <p className="lf-lead">{g.d}</p>
            <div style={css('display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: .9375rem; color: #5B5348')}><span>By <strong style={css('color: #1F1C18')}>{g.by}</strong></span><span>{g.date}</span><span>{g.min}</span></div>
          </div></div>
        </header>
        <div className="lf-wrap" style={css('padding-top: 40px; padding-bottom: 72px')}>
          <div className="lf-prose">
            <div className="lf-note lf-info" role="note"><span><strong>General information, not legal advice.</strong> For advice on your own situation, <Link className="lf-tlink" href={R.contact}>request a consultation</Link>.</span></div>
            <p>[This guide is written out in full for one article in the demo. See <Link href={R.article}>What happens when someone dies without a will</Link> for the complete reading layout.]</p>
          </div>
        </div>
      </article>
      <CtaBand page="article" />
    </>
  );
}
