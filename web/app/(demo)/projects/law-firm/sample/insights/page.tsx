import CtaBand from '@/components/law/CtaBand';
import InsightsList from '@/components/law/InsightsList';
import { css } from '@/lib/law/css';

export const metadata = { title: 'Insights' };

export default async function Page({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  return (
    <>
      <section style={css('padding: 64px 0 32px')}><div className="lf-wrap" style={css('display: flex; flex-direction: column; gap: 16px')}><span className="lf-eyebrow">Insights</span><h1 className="lf-hero-h" style={css('font-size: 3.5rem; font-weight: 500')}>Short guides, in plain language.</h1><p className="lf-lead">Written by our attorneys for people facing these questions for the first time. General information, not advice for your situation.</p></div></section>
      <section style={css('padding: 8px 0 72px')}><div className="lf-wrap" style={css('display: flex; flex-direction: column; gap: 24px')}><InsightsList initialTopic={topic} /></div></section>
      <CtaBand page="insights" />
    </>
  );
}
