import type { Metadata } from 'next';
import ChatWidget from '@/components/assistant/ChatWidget';
import { THEMES, type ThemeName } from '@/lib/assistant/workspaces';
import { loadPublicWorkspace } from '@/lib/server/assistant/settings';
import s from './widget.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — Chat widget on a sample website',
  description: 'Try the knowledge chatbot as a website widget on the fictional Khumalo Home Solar demo site.',
  robots: { index: false },
};

type Search = Promise<{ theme?: string; startOpen?: string; nudge?: string }>;

// Full-screen demo of the widget on a fictional client site (HANDOFF-CHATBOT §1). Query switches: ?theme=, ?startOpen=false, ?nudge=false.
export default async function WidgetDemo({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  // ?theme= is the design's switch for showing the other brand looks. Without it the owner's settings decide.
  const theme: ThemeName | undefined = q.theme && q.theme in THEMES ? (q.theme as ThemeName) : undefined;
  const w = await loadPublicWorkspace('khumalo');
  return (
    <main className={s.site}>
      <h1 className={s.sr}>Knowledge chatbot: the widget on a sample client website</h1>
      <div className={s.inner} aria-hidden="true">
        <div className={s.bar}>
          <span className={s.brand}>
            <span className={s.sun}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            </span>
            {w.business}
          </span>
          <span className={s.nav}><span>Packages</span><span>Batteries</span><span>Finance</span><span>Contact</span></span>
        </div>
        <div className={s.hero}>
          <span className={s.tag}>SAMPLE CLIENT WEBSITE</span>
          <span className={s.h1}>Clean power for Gauteng homes.</span>
          <span className={s.lead}>Panels, inverters and batteries, installed in one to two days.</span>
          <span className={s.cta}>Get a quote</span>
        </div>
        <div className={s.cards}><span /><span /><span /></div>
      </div>
      <ChatWidget workspace={w} theme={theme} startOpen={q.startOpen !== 'false'} nudge={q.nudge !== 'false'} privacyHref="/projects/knowledge-chatbot#privacy" />
    </main>
  );
}
