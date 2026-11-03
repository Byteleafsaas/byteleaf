'use client';

import { useState } from 'react';
import ChatWidget from '@/components/assistant/ChatWidget';
import type { PublicWorkspace, Theme } from '@/lib/assistant/workspaces';
import type { KnownSource } from '@/lib/server/assistant/demo';
import s from './demo.module.css';

const ICON = {
  web: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5',
  typed: 'M4 6h16M4 12h10M4 18h7',
} as const;
// The staff look: ink, square avatar (HANDOFF-CHATBOT section 2).
const INK: Theme = { accent: '#0B1220', onAccent: '#FFFFFF', accentSoft: '#EEF2F8', surface: '#FFFFFF', text: '#0B1220', muted: '#4B5872', border: '#E3E9F2', bubble: '#F2F5F9' };

export default function DemoClient({ workspace, sources, updated, refused }: { workspace: PublicWorkspace; sources: KnownSource[]; updated: string; refused: string[] }) {
  const [mode, setMode] = useState<'web' | 'staff'>('web');
  const [used, setUsed] = useState<string[]>([]);
  const staff = mode === 'staff';
  const visible = sources.filter((x) => staff || !x.staffOnly);
  const ws: PublicWorkspace = staff ? { ...workspace, theme: INK, botName: `${workspace.business} staff assistant`, subtitle: 'Internal · answers from company documents', greeting: 'Hi. Ask me about installs, claims and pricing rules. I answer from our internal documents.', placeholder: 'Ask about installs, claims, pricing rules…', talkToPerson: false, avatar: 'initial' } : workspace;

  return (
    <div className={s.cols}>
      <div className={s.chatCol}>
        <div className={s.modeRow}>
          <div className={s.toggle} role="group" aria-label="Who is asking">
            <button type="button" aria-pressed={!staff} onClick={() => { setMode('web'); setUsed([]); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON.web} /></svg>Customer
            </button>
            <button type="button" aria-pressed={staff} onClick={() => { setMode('staff'); setUsed([]); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z" /></svg>Staff
            </button>
          </div>
          <span className={s.modeNote}>{staff ? 'What a team member sees. Includes internal documents.' : 'What a customer sees on the website.'}</span>
        </div>
        <ChatWidget key={mode} workspace={ws} variant="inline" channel={mode} square={staff} onSources={setUsed} privacyHref="#privacy" />
      </div>

      <aside className={s.side} aria-label="What the assistant knows">
        <section className={s.card2}>
          <div className={s.cardHead}><h2>What this assistant knows</h2><span>{visible.length} published sources{updated ? ` · last updated ${updated}` : ''}</span></div>
          <ul className={s.srcList}>
            {visible.map((x) => {
              const isUsed = used.some((u) => u === x.name.replace(/\.(pdf|docx?|txt|md|csv)$/i, ''));
              return (
                <li key={x.name} className={`${s.src} ${isUsed ? s.srcUsed : ''}`}>
                  <span className={`${s.ico} ${x.type === 'file' ? s.icoFile : x.type === 'typed' ? s.icoTyped : ''}`} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[x.type]} /></svg>
                  </span>
                  <span className={s.srcTxt}><b>{x.name}</b><span>{x.label}</span></span>
                  {isUsed && <span className={`${s.pill} ${s.pUsed}`}>USED</span>}
                  {x.staffOnly && <span className={`${s.pill} ${s.pStaff}`}>STAFF</span>}
                </li>
              );
            })}
          </ul>
        </section>
        <section className={`${s.card2} ${s.wont}`}>
          <h2>It won&apos;t answer</h2>
          <div className={s.topics}>{['Medical or legal advice', 'Other companies', 'Personal finance', ...refused, 'Anything not in the sources'].map((t) => <span key={t}>{t}</span>)}</div>
          <p>Questions it can&apos;t answer go to the owner&apos;s &ldquo;Unanswered&rdquo; list, so the gap gets filled.</p>
        </section>
      </aside>
    </div>
  );
}
