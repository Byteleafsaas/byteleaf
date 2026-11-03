'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { signOutStaffAction, staffAskAction, staffConversationAction, staffHistoryAction, staffSourceAction, type HistoryRow, type SourceView } from '@/lib/server/actions/assistant-staff';
import type { Answer, AnswerSource } from '@/lib/assistant/workspaces';
import s from './staff.module.css';

type Msg = { id: number; role: 'user'; text: string } | { id: number; role: 'bot'; answer: Pick<Answer, 'kind' | 'text' | 'list' | 'sources'> };

const SUGGESTIONS = ['How do I log a warranty claim?', 'How much discount can I give?', 'What do I check before commissioning a battery?'];
const GROUPS: HistoryRow['group'][] = ['Today', 'This week', 'Earlier'];
const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const LOCK = 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z';
const svg = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export default function StaffApp({ name, email, business }: { name: string; email: string; business: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [current, setCurrent] = useState('');
  const [viewer, setViewer] = useState<{ chipKey: string; view: SourceView } | null>(null);
  const cid = useRef('');
  const nid = useRef(1);
  const log = useRef<HTMLDivElement>(null);
  if (!cid.current && typeof crypto !== 'undefined') cid.current = crypto.randomUUID();
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [msgs, busy]);

  const loadHistory = useCallback(async () => {
    const res = await staffHistoryAction();
    if (res.ok) setHistory(res.rows);
  }, []);
  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const newQuestion = () => { setMsgs([]); setCurrent(''); setViewer(null); setError(''); cid.current = crypto.randomUUID(); };

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true); setError(''); setDraft('');
    const hist = msgs.slice(-6).map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), text: m.role === 'user' ? m.text : m.answer.text }));
    setMsgs((x) => [...x, { id: nid.current++, role: 'user', text: question }]);
    const res = await staffAskAction({ question, cid: cid.current, history: hist }).catch(() => ({ ok: false as const, error: 'That didn’t send. Check your connection and try again.' }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setMsgs((x) => [...x, { id: nid.current++, role: 'bot', answer: res.answer }]);
    void loadHistory();
  }

  async function openSource(src: AnswerSource) {
    const key = src.id;
    if (viewer?.chipKey === key) { setViewer(null); return; }
    const res = await staffSourceAction(src.id).catch(() => null);
    if (res?.ok) setViewer({ chipKey: key, view: res.view }); else setError(res && !res.ok ? res.error : 'Couldn’t open that source.');
  }

  async function openChat(row: HistoryRow) {
    const res = await staffConversationAction(row.id);
    if (!res.ok) { setError(res.error); return; }
    cid.current = res.chat.cid; setCurrent(row.id); setViewer(null);
    // Saved chats keep the answer text and source names, not the source passages, so past sources can't be opened.
    setMsgs(res.chat.messages.map((m) => (m.role === 'user' ? { id: nid.current++, role: 'user' as const, text: m.text } : { id: nid.current++, role: 'bot' as const, answer: { kind: m.kind as Answer['kind'], text: m.text, sources: m.sources.map((t, i) => ({ id: `past-${i}`, title: t, passage: '', staff: true })) } })));
  }

  async function signOut() { await signOutStaffAction(); window.location.assign('/projects/knowledge-chatbot/staff'); }

  return (
    <div className={s.page}>
      <header className={s.bar}>
        <span className={s.logo} aria-hidden="true">{business[0]}</span>
        <div className={s.barTxt}><b>{business.split(' ')[0]} staff assistant</b><small>INTERNAL · AI · answers from company documents</small></div>
        <div className={s.who}><span className={s.av} aria-hidden="true">{initials(name)}</span><div><b>{name}</b><small>{email}</small></div></div>
        <button type="button" className={s.out} onClick={signOut} aria-label="Sign out"><svg width="18" height="18" viewBox="0 0 24 24" strokeWidth={1.8} {...svg}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg></button>
      </header>

      <div className={`${s.body} ${viewer ? s.withViewer : ''}`}>
        <nav className={s.hist} aria-label="Your questions">
          <button type="button" className={s.newQ} onClick={newQuestion}><svg width="16" height="16" viewBox="0 0 24 24" strokeWidth={2.2} {...svg}><path d="M12 5v14M5 12h14" /></svg>New question</button>
          {GROUPS.map((g) => history.some((h) => h.group === g) && (
            <Fragment key={g}>
              <span className={s.grp}>{g === 'Today' ? 'Today' : g === 'This week' ? 'This week' : 'Earlier'}</span>
              {history.filter((h) => h.group === g).map((h) => (
                <button key={h.id} type="button" className={s.hItem} aria-current={h.id === current} onClick={() => openChat(h)}><b>{h.title}</b>{h.source && <span>{h.source}</span>}</button>
              ))}
            </Fragment>
          ))}
          <p className={s.histFoot}>Your history is private to you and kept for 30 days.</p>
        </nav>

        <section className={s.chat} aria-label="Chat">
          <div className={s.log} ref={log} role="log" aria-live="polite" aria-label="Conversation">
            {msgs.length === 0 && <div className={s.empty}><b>Ask about installs, claims or pricing rules</b><span>I answer from our internal documents, and show you which one so you can check it.</span></div>}
            {msgs.map((m) => m.role === 'user' ? <div key={m.id} className={s.uMsg}><span className={s.sr}>You said: </span>{m.text}</div> : (
              <div key={m.id} className={s.aRow}>
                <span className={s.aAv} aria-hidden="true">{business[0]}</span>
                <div className={s.aBody}>
                  <p><span className={s.sr}>Assistant said: </span>{m.answer.text}</p>
                  {m.answer.list && <ol>{m.answer.list.map((x) => <li key={x}>{x}</li>)}</ol>}
                  {m.answer.kind === 'unknown' && <span className={s.dim}>I couldn&apos;t find this in the documents, so I won&apos;t guess. Ask the site lead or the owner.</span>}
                  {m.answer.sources.map((src) => (
                    <button key={src.id} type="button" className={s.chip} aria-pressed={viewer?.chipKey === src.id} disabled={src.id.startsWith('past-')} onClick={() => openSource(src)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth={2} {...svg}><path d={LOCK} /></svg>{src.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {busy && <div className={s.aRow} role="status"><span className={s.aAv} aria-hidden="true">{business[0]}</span><div className={s.aBody}><span className={s.dim}>Looking through the documents…</span></div></div>}
          </div>
          {error && <div className={s.err} role="alert">{error}</div>}
          <div className={s.sugg}>{SUGGESTIONS.map((q) => <button key={q} type="button" onClick={() => void ask(q)}>{q}</button>)}</div>
          <form className={s.form} onSubmit={(e: FormEvent) => { e.preventDefault(); void ask(draft); }}>
            <label htmlFor="sq" className={s.sr}>Ask a question</label>
            <input id="sq" type="text" autoComplete="off" maxLength={500} placeholder="Ask about installs, claims, pricing rules…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button type="submit" className={s.send} aria-label="Send" disabled={busy || !draft.trim()}><svg width="20" height="20" viewBox="0 0 24 24" strokeWidth={2.2} {...svg}><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
          </form>
          <p className={s.note}>AI can make mistakes. Check the source before you act on anything safety-related.</p>
        </section>

        {viewer && (
          <aside className={s.viewer} aria-label="Source">
            <div className={s.vHead}>
              <span className={s.vIco} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" strokeWidth={1.8} {...svg}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5" /></svg></span>
              <div><b>{viewer.view.title}</b><small>{viewer.view.kind}{viewer.view.staffOnly ? ' · STAFF ONLY' : ''}{viewer.view.where ? ` · ${viewer.view.where.toUpperCase()}` : ''}</small></div>
              <button type="button" className={s.out} style={{ color: '#4B5872' }} onClick={() => setViewer(null)} aria-label="Close source"><svg width="18" height="18" viewBox="0 0 24 24" strokeWidth={2} {...svg}><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            </div>
            <div className={s.vBody}>
              <div className={s.doc}>
                {viewer.view.before.map((t) => <p key={t} className={s.ctx}>{t}</p>)}
                <p><mark className={s.hl}>{viewer.view.text}</mark></p>
                {viewer.view.after.map((t) => <p key={t} className={s.ctx}>{t}</p>)}
              </div>
              <p className={s.vNote}>Highlighted: the passage the answer used. Owner: {viewer.view.owner} · updated {viewer.view.updated}</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
