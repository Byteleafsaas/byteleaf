'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { THEMES, type Answer, type PublicWorkspace, type ThemeName } from '@/lib/assistant/workspaces';
import { askAssistantAction, assistantFeedbackAction, assistantHandoverAction } from '@/lib/server/actions/assistant';
import s from './ChatWidget.module.css';

type Feedback = '' | 'up' | 'down' | 'reasoned';
type Msg =
  | { id: number; role: 'user'; text: string; failed?: boolean }
  | { id: number; role: 'typing' }
  | { id: number; role: 'bot'; question: string; ans: Answer; shown: number; fb: Feedback; open: number; showAll: boolean; full: boolean }
  | { id: number; role: 'error'; question: string; userId: number }
  | { id: number; role: 'notice'; text: string };

const REASONS = ['Wrong answer', 'Not clear', 'Not what I asked', 'Something else'];
const LONG_ANSWER = 340; // characters; above this the answer collapses behind "Show full answer"
const MIN_TYPING_MS = 900;
const waitLabel = (n: number) => (n > 90 ? `${Math.ceil(n / 60)} minutes` : `${n} seconds`);
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const svg = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const SunIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...svg}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
const DocIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth={2} {...svg}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5" /></svg>
);
const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth={2} {...svg}><path d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z" /></svg>
);
const AlertIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...svg} style={{ flex: 'none', marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
);

export type ChatWidgetProps = {
  workspace: PublicWorkspace;
  theme?: ThemeName;
  startOpen?: boolean;
  /** 'inline' puts the chat in the page (no launcher), for the demo page and the staff assistant. */
  variant?: 'floating' | 'inline';
  /** Staff mode answers from internal documents too. */
  channel?: 'web' | 'staff';
  /** Square avatar, for the staff look. */
  square?: boolean;
  /** Called with the source names each time an answer arrives, so the page can highlight what was used. */
  onSources?: (titles: string[]) => void;
  /** Show the "unread message" nudge on the closed launcher. */
  nudge?: boolean;
  privacyHref?: string;
};

export default function ChatWidget({ workspace: w, theme, startOpen = false, nudge = true, privacyHref: privacyProp, variant = 'floating', channel = 'web', square = false, onSources }: ChatWidgetProps) {
  const inline = variant === 'inline';
  // A named theme (from ?theme=) wins; otherwise the owner's settings; otherwise byteleaf blue.
  const th = theme ? THEMES[theme] : (w.theme ?? THEMES.byteleaf);
  const privacyHref = w.privacyHref ?? privacyProp ?? '#privacy';
  const canTalk = w.talkToPerson !== false;
  const contactLabel = w.form?.phone === true && w.form?.email === false ? 'Phone number' : w.form?.email === true && w.form?.phone === false ? 'Email address' : 'Email or phone';
  const [open, setOpen] = useState(startOpen || variant === 'inline');
  const [seen, setSeen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [waitTotal, setWaitTotal] = useState(0);
  const [sheet, setSheet] = useState<'' | 'form' | 'sent'>('');
  const [sheetQ, setSheetQ] = useState('');
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetErr, setSheetErr] = useState('');

  const nid = useRef(1);
  // One id per visit, so the server can save the exchange as a single conversation.
  const cid = useRef('');
  if (!cid.current && typeof crypto !== 'undefined') cid.current = crypto.randomUUID();
  const alive = useRef(true);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const userOpened = useRef(false);
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = msgs;

  const vars = {
    '--cb-accent': th.accent, '--cb-on-accent': th.onAccent, '--cb-accent-soft': th.accentSoft,
    '--cb-surface': th.surface, '--cb-text': th.text, '--cb-muted': th.muted,
    '--cb-border': th.border, '--cb-bubble': th.bubble,
  } as CSSProperties;

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [msgs, open, sheet]);

  // Focus: input when the visitor opens the chat, launcher when it closes. Not on first paint.
  useEffect(() => {
    if (!userOpened.current) return;
    if (open && !sheet) input.current?.focus();
    if (!open) launcher.current?.focus();
  }, [open, sheet]);

  // On phones the open chat fills the screen, so stop the page behind it from scrolling.
  useEffect(() => {
    if (inline || !open || typeof window === 'undefined' || !window.matchMedia('(max-width: 600px)').matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, inline]);

  // Streaming: three characters every 24ms until the answer is fully shown.
  const streaming = msgs.some((m) => m.role === 'bot' && m.shown < m.ans.text.length);
  useEffect(() => {
    if (!streaming) return;
    const iv = setInterval(() => {
      setMsgs((ms) => ms.map((m) => (m.role === 'bot' && m.shown < m.ans.text.length ? { ...m, shown: Math.min(m.ans.text.length, m.shown + 3) } : m)));
    }, 24);
    return () => clearInterval(iv);
  }, [streaming]);

  // Rate-limit countdown.
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const openIt = () => { userOpened.current = true; setOpen(true); setSeen(true); };
  const closeIt = () => { userOpened.current = true; setOpen(false); setSheet(''); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeIt(); };
  const toTeam = (q = '') => { setSheetQ(q); setSheetErr(''); setSheet('form'); };

  const patch = useCallback((id: number, p: Partial<Extract<Msg, { role: 'bot' }>>) => {
    setMsgs((ms) => ms.map((m) => (m.id === id && m.role === 'bot' ? { ...m, ...p } : m)));
  }, []);

  /** Sends one question. `retryUser` re-sends a message that failed instead of adding a new one. */
  const send = useCallback(async (raw: string, retryUser?: number) => {
    const q = raw.trim();
    if (!q || busy || wait > 0) return;
    setBusy(true);
    setDraft('');
    const typingId = nid.current++;
    const userId = retryUser ?? nid.current++;
    const history: { role: 'user' | 'assistant'; text: string }[] = [];
    for (const m of msgsRef.current) {
      if (m.role === 'user' && m.id !== retryUser) history.push({ role: 'user', text: m.text });
      else if (m.role === 'bot' && m.ans.kind === 'answer') history.push({ role: 'assistant', text: m.ans.text });
    }
    setMsgs((ms) => [
      ...ms.filter((m) => m.role !== 'error').map((m) => (m.id === retryUser && m.role === 'user' ? { ...m, failed: false } : m)),
      ...(retryUser ? [] : [{ id: userId, role: 'user' as const, text: q }]),
      { id: typingId, role: 'typing' as const },
    ]);

    const t0 = Date.now();
    let ans: Answer | null = null;
    try {
      ans = await askAssistantAction({ workspace: w.id, question: q, cid: cid.current, channel, history: history.slice(-6) });
    } catch {
      ans = null;
    }
    const spent = Date.now() - t0;
    if (spent < MIN_TYPING_MS) await delay(MIN_TYPING_MS - spent);
    if (!alive.current) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setMsgs((ms) => {
      const rest = ms.filter((m) => m.id !== typingId);
      if (!ans) return [...rest.map((m) => (m.id === userId && m.role === 'user' ? { ...m, failed: true } : m)), { id: nid.current++, role: 'error' as const, question: q, userId }];
      if (ans.kind === 'ratelimit') return [...rest, { id: nid.current++, role: 'notice' as const, text: ans.text }];
      const text = ans.text;
      return [...rest, { id: nid.current++, role: 'bot' as const, question: q, ans, shown: reduce ? text.length : 0, fb: '' as Feedback, open: -1, showAll: false, full: false }];
    });
    if (ans) onSources?.(ans.sources.map((x) => x.title));
    if (ans?.kind === 'ratelimit') { setWait(ans.waitSeconds ?? 30); setWaitTotal(ans.waitSeconds ?? 30); }
    if (ans?.kind === 'handover') toTeam('');
    setBusy(false);
  }, [busy, wait, w.id, channel, onSources]);

  const rate = (m: Extract<Msg, { role: 'bot' }>, fb: Feedback, reason = '') => {
    patch(m.id, { fb });
    if (fb === 'up' || fb === 'reasoned') {
      void assistantFeedbackAction({ workspace: w.id, cid: cid.current, mid: m.ans.mid, helpful: fb === 'up', reason, question: m.question, answer: m.ans.text, sources: m.ans.sources.map((x) => x.title) }).catch(() => {});
    }
  };

  const submitSheet = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSheetBusy(true);
    setSheetErr('');
    const res = await assistantHandoverAction({
      workspace: w.id, cid: cid.current, name: String(f.get('name') ?? ''), suburb: String(f.get('suburb') ?? ''), contact: String(f.get('contact') ?? ''), question: String(f.get('question') ?? ''),
      consent: f.get('consent') === 'on' ? true : (false as unknown as true), trap: String(f.get('trap') ?? ''),
    }).catch(() => ({ ok: false as const, error: "That didn't send. Please check your connection and try again." }));
    setSheetBusy(false);
    if (res.ok) setSheet('sent');
    else setSheetErr(res.error);
  };

  const showNudge = !inline && !open && nudge && !seen;
  const nothingYet = msgs.length === 0;
  const lastQuestion = (id: number) => {
    const i = msgs.findIndex((m) => m.id === id);
    for (let k = i - 1; k >= 0; k--) { const m = msgs[k]; if (m.role === 'user') return m.text; }
    return '';
  };

  return (
    <div className={s.root} style={vars}>
      {showNudge && (
        <div className={s.nudge} role="status"><strong>{w.nudge.title}</strong>{w.nudge.text}</div>
      )}

      {!open && !inline && (
        <button ref={launcher} type="button" className={s.launch} onClick={openIt} aria-expanded="false" aria-label={`${w.launcherLabel}${showNudge ? ', 1 new message' : ''}`}>
          <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth={2} {...svg}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" /></svg>
          {showNudge && <span className={s.badge}>1</span>}
        </button>
      )}

      {open && (
        <>
          <section className={`${s.panel} ${inline ? s.inlinePanel : ''}`} role={inline ? 'region' : 'dialog'} aria-modal={inline ? undefined : 'false'} aria-labelledby="cb-title" onKeyDown={inline ? undefined : onKey}>
            <header className={s.head}>
              <span className={`${s.avatar} ${square ? s.sq : ''}`} aria-hidden="true" style={w.avatar === 'logo' ? { background: '#E8A317', color: '#fff' } : w.avatar === 'ai' ? { background: '#0B1220', color: '#fff', fontWeight: 600, fontSize: 14 } : undefined}>{w.avatar === 'ai' ? 'AI' : w.avatar === 'initial' ? (w.botName.trim()[0] ?? 'A').toUpperCase() : <SunIcon />}</span>
              <div className={s.who}>
                <h2 id="cb-title">{w.botName}</h2>
                <span className={s.sub}><span className={s.pill}>AI</span>{w.subtitle}</span>
              </div>
              {canTalk && <button type="button" className={s.ib} onClick={() => toTeam('')} aria-label="Talk to a person">
                <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth={1.8} {...svg}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
              </button>}
              {inline ? (
                <button type="button" className={s.startOver} onClick={() => { setMsgs([]); setSheet(''); cid.current = crypto.randomUUID(); onSources?.([]); }}>Start over</button>
              ) : (
                <button type="button" className={s.ib} onClick={closeIt} aria-label="Close chat (Esc)">
                  <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth={2} {...svg}><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              )}
            </header>

            {!sheet && (
              <>
                <div ref={log} className={s.log} role="log" aria-live="polite" aria-label="Conversation">
                  <div className={`${s.msg} ${s.bubble}`} style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>{w.greeting}</div>
                  {nothingYet && (
                    <div className={s.suggest}>
                      <span className={s.small}>Popular questions</span>
                      {w.suggestions.map((q) => <button key={q} type="button" className={s.chip} onClick={() => void send(q)}>{q}</button>)}
                    </div>
                  )}

                  {msgs.map((m) => {
                    if (m.role === 'user') {
                      return (
                        <div key={m.id} style={{ display: 'contents' }}>
                          <div className={`${s.msg} ${s.user} ${m.failed ? s.userFailed : ''}`}><span className={s.sr}>You said: </span>{m.text}</div>
                          {m.failed && <span className={s.notSent}><AlertIcon size={14} />Not sent</span>}
                        </div>
                      );
                    }
                    if (m.role === 'typing') {
                      return <div key={m.id} className={`${s.msg} ${s.typing}`} role="status"><span className={s.sr}>Assistant is typing</span><span className={s.dot} /><span className={s.dot} /><span className={s.dot} /></div>;
                    }
                    if (m.role === 'error') {
                      return (
                        <div key={m.id} className={`${s.msg} ${s.errBubble}`} role="alert">
                          <AlertIcon />Couldn&apos;t send. Check your connection and try again.
                          <button type="button" onClick={() => void send(m.question, m.userId)}>Retry</button>
                        </div>
                      );
                    }
                    if (m.role === 'notice') {
                      return <div key={m.id} className={`${s.msg} ${s.notice}`} role="status"><AlertIcon />{m.text}</div>;
                    }

                    const done = m.shown >= m.ans.text.length;
                    const a = m.ans;
                    const isAnswer = a.kind === 'answer';
                    const long = done && a.text.length + (a.list?.join('').length ?? 0) > LONG_ANSWER;
                    const shownSources = m.showAll ? a.sources : a.sources.slice(0, 3);
                    return (
                      <div key={m.id} className={`${s.msg} ${s.bot}`}>
                        <div className={s.bubble}>
                          <div className={long && !m.full ? s.clamped : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <p><span className={s.sr}>Assistant said: </span>{a.text.slice(0, m.shown)}{!done && <span className={s.caret} aria-hidden="true" />}</p>
                            {done && a.list && <ul className={s.list}>{a.list.map((li) => <li key={li}>{li}</li>)}</ul>}
                            {done && a.link && <a className={s.alink} href={a.link.href} target="_blank" rel="noopener noreferrer">{a.link.label} ↗</a>}
                          </div>
                          {long && <button type="button" className={s.more} onClick={() => patch(m.id, { full: !m.full })}>{m.full ? 'Show less' : 'Show full answer'}</button>}
                          {done && a.kind === 'unknown' && canTalk && <button type="button" className={`${s.btn} ${s.btnO} ${s.askTeam}`} onClick={() => toTeam(lastQuestion(m.id))}>Ask the team</button>}
                          {done && a.kind === 'off' && (
                            <div className={s.topics}>{w.topics.map((q) => <button key={q} type="button" className={`${s.chip} ${s.chipSm}`} onClick={() => void send(q)}>{q}</button>)}</div>
                          )}
                        </div>

                        {done && (
                          <>
                            <div className={s.meta}>
                              {a.kind === 'unknown' && <span className={s.nosrc}><svg width="14" height="14" viewBox="0 0 24 24" strokeWidth={2} {...svg}><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>No source found</span>}
                              {a.kind === 'chat' && <span className={s.nosrc}>General reply · no source needed</span>}
                              {shownSources.map((src, i) => (
                                <button key={src.id} type="button" className={s.src} aria-expanded={m.open === i} onClick={() => patch(m.id, { open: m.open === i ? -1 : i })}>
                                  {src.staff ? <LockIcon /> : <DocIcon />}<span><span className={s.sr}>Source: </span>{src.title}</span>
                                </button>
                              ))}
                              {!m.showAll && a.sources.length > 3 && <button type="button" className={s.more} onClick={() => patch(m.id, { showAll: true })}>+{a.sources.length - 3} more</button>}
                              {isAnswer && m.fb !== 'reasoned' && m.fb !== 'up' && (
                                <span className={s.rate}>
                                  <button type="button" className={s.ib} aria-pressed="false" aria-label="Helpful" onClick={() => rate(m, 'up')}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth={1.8} {...svg}><path d="M7 10v11H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7" /></svg>
                                  </button>
                                  <button type="button" className={s.ib} aria-pressed={m.fb === 'down'} aria-label="Not helpful" style={m.fb === 'down' ? { color: 'var(--cb-accent)' } : undefined} onClick={() => patch(m.id, { fb: 'down' })}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth={1.8} {...svg} fill={m.fb === 'down' ? 'currentColor' : 'none'}><path d="M17 14V3h3v11zM17 14l-4 7a2 2 0 0 1-3-2l1-5H5a2 2 0 0 1-2-2.3l1.4-7A2 2 0 0 1 6.4 3H17" /></svg>
                                  </button>
                                </span>
                              )}
                            </div>
                            {m.open > -1 && shownSources[m.open] && <div className={s.snip}><b>From: {shownSources[m.open].title}</b>“{shownSources[m.open].passage}”</div>}
                            {m.fb === 'down' && (
                              <div role="group" aria-label="What was wrong?" className={s.reasons}>
                                <span>What was wrong?</span>
                                {REASONS.map((r) => <button key={r} type="button" className={`${s.chip} ${s.chipSm}`} onClick={() => rate(m, 'reasoned', r)}>{r}</button>)}
                              </div>
                            )}
                            {(m.fb === 'up' || m.fb === 'reasoned') && <span role="status" className={s.small}>{m.fb === 'up' ? 'Thanks for letting us know.' : 'Thanks. The team will review this answer.'}</span>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <form className={s.foot} onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
                  {wait > 0 && <span className={s.wait} style={{ animationDuration: `${waitTotal}s` }} aria-hidden="true" />}
                  <div className={s.row}>
                    <label htmlFor="cb-in" className={s.sr}>Type your question</label>
                    <input ref={input} id="cb-in" className={`${s.inp} ${s.ask}`} type="text" autoComplete="off" maxLength={500} disabled={wait > 0}
                      placeholder={wait > 0 ? `Please wait ${waitLabel(wait)}…` : w.placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <button type="submit" className={s.send} aria-label="Send" disabled={wait > 0 || busy || !draft.trim()}>
                      <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth={2.2} {...svg}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  </div>
                  <div className={s.legal}>
                    <span>AI assistant · <a className={s.lnk} href={privacyHref}>Privacy</a></span>
                    {canTalk && <button type="button" className={s.lnk} onClick={() => toTeam('')}>Talk to a person</button>}
                  </div>
                </form>
              </>
            )}

            {sheet === 'form' && (
              <form className={s.sheet} onSubmit={submitSheet}>
                <h3>Ask the team</h3>
                <p>This is a separate form, not the chat. {w.handoverNote}</p>
                <div className={s.field}><label htmlFor="h-n">Your name</label><input id="h-n" name="name" className={s.inp} type="text" autoComplete="name" required maxLength={120} /></div>
                <div className={s.field}><label htmlFor="h-c">{contactLabel}</label><input id="h-c" name="contact" className={s.inp} type="text" autoComplete="email" required maxLength={200} /></div>
                <div className={s.field}><label htmlFor="h-q">Your question</label><textarea id="h-q" name="question" className={s.inp} rows={3} maxLength={1000} defaultValue={sheetQ} style={{ resize: 'vertical' }} /></div>
                {w.form?.suburb && <div className={s.field}><label htmlFor="h-s">Suburb</label><input id="h-s" name="suburb" className={s.inp} type="text" autoComplete="address-level2" maxLength={120} /></div>}
                <input className={s.trap} type="text" name="trap" tabIndex={-1} autoComplete="new-password" aria-hidden="true" />
                <label className={s.consent}><input type="checkbox" name="consent" required />I agree that {w.business} may contact me about this question. <a href={privacyHref}>Privacy note</a></label>
                {sheetErr && <p className={s.formErr} role="alert">{sheetErr}</p>}
                <div className={s.actions}>
                  <button type="button" className={`${s.btn} ${s.btnO}`} onClick={() => setSheet('')}>Back to chat</button>
                  <button type="submit" className={`${s.btn} ${s.btnA}`} style={{ flex: 1 }} disabled={sheetBusy}>{sheetBusy ? 'Sending…' : 'Send to the team'}</button>
                </div>
              </form>
            )}

            {sheet === 'sent' && (
              <div className={s.sent} role="status">
                <span className={s.tick}><svg width="30" height="30" viewBox="0 0 24 24" strokeWidth={2.6} {...svg}><path d="M5 12l5 5L20 7" /></svg></span>
                <h3>Sent to the team</h3>
                <p>A person will get back to you, usually within [X business hours].</p>
                <button type="button" className={`${s.btn} ${s.btnO}`} onClick={() => setSheet('')}>Back to chat</button>
              </div>
            )}
          </section>
          {!inline && <button type="button" className={`${s.launch} ${s.closeFloat}`} onClick={closeIt} aria-expanded="true" aria-label="Close chat">
            <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth={2.2} {...svg}><path d="M6 9l6 6 6-6" /></svg>
          </button>}
        </>
      )}
    </div>
  );
}
