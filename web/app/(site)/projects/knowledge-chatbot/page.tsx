import type { Metadata } from 'next';
import { SHOWCASE as M, eyebrowFor } from '@/lib/projects-meta';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { loadKnownSources } from '@/lib/server/assistant/demo';
import { getAssistantSettings, loadPublicWorkspace } from '@/lib/server/assistant/settings';
import DemoClient from './DemoClient';
import s from './demo.module.css';

export const metadata: Metadata = {
  title: `byteleaf — ${M.chatbot.name}`,
  description: 'Try an AI chatbot that answers repeat customer questions from approved business information and shows the sources it uses.',
};

// Always read the latest published knowledge and settings.
export const dynamic = 'force-dynamic';

const STEPS = [
  { t: 'Add what you already have', d: 'Upload price lists and policies, paste your FAQs or import pages from your website.' },
  { t: 'Review before you publish', d: 'AI organises your material into short entries. You can edit and approve each one before publishing it.' },
  { t: 'See where customers need help', d: 'Customers can check the sources behind an answer. Review unanswered questions to see what to add next.' },
];

export default async function Page() {
  const [workspace, settings, known] = await Promise.all([loadPublicWorkspace('khumalo'), getAssistantSettings('khumalo'), loadKnownSources('khumalo')]);
  return (
    <main>
      <section className={s.hero}>
        <div className={s.heroIn}>
          <span className={s.crumb}><Link href="/projects">Projects</Link> / {M.chatbot.name}</span>
          <span className="eyebrow">{eyebrowFor(M.chatbot)}</span>
          <h1 className="h1" style={{ maxWidth: 760 }}>Answer repeat questions with <span className="hl">your own information.</span></h1>
          <div className={s.heroRow}>
            <p className="lead">Try a question about installation costs or warranties. Check the source it cites, or see how it offers to connect you with a person when it can’t answer.</p>
            <Link className="btn btn-ghost" href="/projects/knowledge-chatbot/widget">See it as a website widget</Link>
          </div>
          <div className={s.warn} role="note">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><strong>Interactive demo.</strong> The chat uses sample prices and policies for {workspace.business}, a fictional solar installer. Please use sample details.</span>
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

      <CtaBand title="Want a chatbot for your business?" text="We’ll set it up with your approved content, match it to your site and route handovers to your team." />
      <Footer />
    </main>
  );
}
