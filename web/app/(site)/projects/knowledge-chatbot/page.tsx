import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { loadKnownSources } from '@/lib/server/assistant/demo';
import { getAssistantSettings, loadPublicWorkspace } from '@/lib/server/assistant/settings';
import DemoClient from './DemoClient';
import s from './demo.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — Knowledge chatbot',
  description: 'An AI assistant that answers customer and staff questions only from your own information, shows its sources, and hands over to a person when it does not know.',
};

// Always read the latest published knowledge and settings.
export const dynamic = 'force-dynamic';

const STEPS = [
  { t: 'Add what you already have', d: 'Upload documents, paste text or point it at your website. Nothing needs to be rewritten first.' },
  { t: 'Check what AI cleaned up', d: 'AI organises everything into short, clear items. You approve, edit or reject each one before anything goes live.' },
  { t: 'Customers and staff get answers', d: 'Every answer shows its source. Questions it cannot answer come back to you to fill the gap.' },
];

export default async function Page() {
  const [workspace, settings, known] = await Promise.all([loadPublicWorkspace('khumalo'), getAssistantSettings('khumalo'), loadKnownSources('khumalo')]);
  return (
    <main>
      <section className={s.hero}>
        <div className={s.heroIn}>
          <span className={s.crumb}><Link href="/projects">Projects</Link> / Knowledge chatbot</span>
          <span className="eyebrow">A CHATBOT THAT KNOWS YOUR BUSINESS</span>
          <h1 className="h1" style={{ maxWidth: 760 }}>An assistant that only answers from <span className="hl">your own information.</span></h1>
          <div className={s.heroRow}>
            <p className="lead">Ask it anything a customer would. Every answer shows where it came from, and when it doesn&apos;t know, it says so and hands over to a person.</p>
            <Link className="btn btn-ghost" href="/projects/knowledge-chatbot/widget">See it as a website widget</Link>
          </div>
          <div className={s.warn} role="note">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><strong>This is a demo with sample data.</strong> {workspace.business} is a made-up business, and every price and policy here is invented. Please don&apos;t type personal details.</span>
          </div>
        </div>
      </section>

      <div className={s.main}>
        <DemoClient workspace={workspace} sources={known.sources} updated={known.updated} refused={settings.refused} />
      </div>

      <section className={s.how}>
        <div className={s.howIn}>
          <h2 className="h2">How it works for your business</h2>
          <div className={s.howGrid}>
            {STEPS.map((x, i) => (
              <article key={x.t} className={s.step}><span className={s.num}>{String(i + 1).padStart(2, '0')}</span><h3>{x.t}</h3><p>{x.d}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className={s.privacy}>
        <div className={s.privacyIn} id="privacy">
          <h2>About this demo and your data</h2>
          <p>Chats are anonymous. Phone numbers, emails and ID numbers are removed before a chat is saved, and chats are deleted after {settings.retentionDays} days. The assistant never asks for personal details in the chat. If you ask for a person, you use a separate short form instead.</p>
        </div>
      </section>

      <CtaBand title="Want one trained on your business?" text="We'll set it up with your information, your colours and your team's contact details." />
      <Footer />
    </main>
  );
}
