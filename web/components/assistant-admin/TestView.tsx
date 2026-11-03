'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PathIcon } from '@/components/admin/icons';
import { Switch, TopBar } from '@/components/admin/Ui';
import { testAssistantAction } from '@/lib/server/actions/assistant-tools';
import type { TestResult, WhySource } from '@/lib/server/assistant/engine';
import a from '@/components/admin/admin.module.css';
import s from './assistant.module.css';
import t from './tools.module.css';

type Msg = { id: number; role: 'user'; text: string } | { id: number; role: 'bot'; text: string; result: TestResult };

const SUGGESTIONS = ['How much is the family package?', 'Can I get just a battery?', 'Do you fit solar geysers?', 'Can I get a discount?'];
const STATUS: Record<WhySource['status'], { label: string; cls: string }> = {
  live: { label: 'LIVE', cls: t.pLive }, notlive: { label: 'NOT LIVE', cls: t.pNot }, unpublished: { label: 'UNPUBLISHED', cls: t.pUnpub }, staff: { label: 'STAFF ONLY', cls: t.pStaff },
};
const INFO = 'M12 16v-4M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z';

export default function TestView({ liveCount }: { liveCount: number }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [includeDraft, setIncludeDraft] = useState(false);
  const [staff, setStaff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState(liveCount);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [msgs, busy]);

  const current = msgs.find((m): m is Extract<Msg, { role: 'bot' }> => m.id === sel && m.role === 'bot');

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true); setError(''); setDraft('');
    const uid = Date.now();
    const history = msgs.slice(-6).map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), text: m.text }));
    setMsgs((x) => [...x, { id: uid, role: 'user', text: question }]);
    const res = await testAssistantAction({ question, draft: includeDraft, staff, history }).catch(() => ({ ok: false as const, error: 'The test didn’t run. Check your connection and try again.' }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    const full = [res.result.answer.text, ...(res.result.answer.list ?? [])].join(' ');
    setMsgs((x) => [...x, { id: uid + 1, role: 'bot', text: full, result: res.result }]);
    setSel(uid + 1);
    setLive(res.result.liveCount);
  }

  const reset = () => { setMsgs([]); setSel(null); setError(''); };
  const outcome = (r: TestResult) => {
    const k = r.answer.kind;
    const n = r.answer.sources.length;
    return k === 'answer' ? { label: 'ANSWERED', cls: t.oAns, n } : k === 'unknown' ? { label: "DIDN'T KNOW", cls: t.oUnk, n: r.why.sources.length } : { label: k === 'off' ? 'REFUSED' : 'REPLY', cls: t.oOff, n: 0 };
  };

  return (
    <>
      <TopBar crumb="Khumalo Home Solar / Knowledge" title="Test assistant">
        <div className={t.seg} role="group" aria-label="Who is asking">
          <button type="button" aria-pressed={!staff} onClick={() => { setStaff(false); reset(); }}>As a customer</button>
          <button type="button" aria-pressed={staff} onClick={() => { setStaff(true); reset(); }}>As staff</button>
        </div>
        <button type="button" className={`${a.btn} ${a.btnGhost}`} onClick={reset}><PathIcon d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" size={18} />Start over</button>
      </TopBar>

      <div className={s.page}>
        <div className={`${t.infoBar} ${includeDraft ? t.draft : ''}`} role="status">
          <PathIcon d={INFO} size={20} />
          <p>{includeDraft ? <><strong>Testing with unpublished changes.</strong> Approved items that are not published yet are included. Customers don&apos;t see these until you publish.</> : <><strong>Testing the live version.</strong> This is exactly what {staff ? 'staff' : 'customers'} get right now, from {live} live items.</>}</p>
          <span className={t.switchRow}>Include unpublished changes<Switch checked={includeDraft} onChange={(v) => { setIncludeDraft(v); reset(); }} label="Include unpublished changes" /></span>
        </div>

        <div className={t.testGrid}>
          <section className={`${a.panel} ${t.chatPanel}`} aria-label="Test chat">
            <div className={t.cHead}>
              <span className={t.cAvatar} aria-hidden="true">K</span>
              <div><b>Khumalo assistant</b><small>Test chat · not saved to conversations · not counted in stats</small></div>
              <span className={t.testTag}>TEST</span>
            </div>
            <div className={t.cLog} ref={log} role="log" aria-live="polite" aria-label="Test conversation">
              {msgs.length === 0 && <p className={t.empty2}>Ask the assistant anything a customer would. Click an answer to see how it decided.</p>}
              {msgs.map((m) => {
                if (m.role === 'user') return <div key={m.id} className={t.bUser}>{m.text}</div>;
                const o = outcome(m.result);
                return (
                  <div key={m.id} style={{ display: 'contents' }}>
                    <button type="button" className={t.bBot} aria-pressed={sel === m.id} onClick={() => setSel(m.id)}>{m.text}</button>
                    <span className={t.outcome}><span className={`${t.pill} ${o.cls}`}>{o.label}</span>{o.n > 0 ? `${o.n} source${o.n === 1 ? '' : 's'} · click to inspect` : 'click to inspect'}</span>
                  </div>
                );
              })}
              {busy && <div className={t.bBot} role="status" style={{ cursor: 'default' }}>Thinking…</div>}
              {error && <div className={s.err} role="alert"><PathIcon d={INFO} size={18} /><span>{error}</span></div>}
            </div>
            <div className={t.sugg}>{SUGGESTIONS.map((q) => <button key={q} type="button" onClick={() => void ask(q)}>{q}</button>)}</div>
            <form className={t.cForm} onSubmit={(e: FormEvent) => { e.preventDefault(); void ask(draft); }}>
              <label htmlFor="test-q" className={t.sr}>Type a test question</label>
              <input id="test-q" className={a.field} type="text" autoComplete="off" maxLength={500} placeholder="Type a test question" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button type="submit" className={t.send} aria-label="Send test question" disabled={busy || !draft.trim()}><PathIcon d="M5 12h14M13 6l6 6-6 6" size={20} /></button>
            </form>
          </section>

          <aside className={`${a.panel} ${t.whyPanel}`} aria-label="Why it answered this">
            {current ? (
              <div className={t.why}>
                <span className={t.kicker}>Why it answered this</span>
                <h2>&ldquo;{msgs[msgs.findIndex((m) => m.id === current.id) - 1]?.text}&rdquo;</h2>
                <div className={t.meter}>
                  <span className={t.meterTop}><b>How sure it was</b><b className={current.result.why.confidence >= 80 ? t.tGood : current.result.why.confidence >= 55 ? t.tMid : t.tLow}>{current.result.why.label}</b></span>
                  <span className={t.meterBar} role="progressbar" aria-valuenow={current.result.why.confidence} aria-valuemin={0} aria-valuemax={100} aria-label="How sure the assistant was"><span className={current.result.why.confidence >= 80 ? t.mGood : current.result.why.confidence >= 55 ? t.mMid : t.mLow} style={{ width: `${Math.max(4, current.result.why.confidence)}%` }} /></span>
                </div>
                <p>{current.result.why.note}</p>
                <h3>Sources it read ({current.result.why.sources.length})</h3>
                {current.result.why.sources.length === 0 && <p className={t.hint}>Nothing in the knowledge matched this question.</p>}
                {current.result.why.sources.map((src, i) => (
                  <div key={`${src.name}-${i}`} className={`${t.readCard} ${src.status === 'notlive' ? t.notLive : ''}`}>
                    <span className={t.readTop}><b>{src.name}</b><span className={`${t.pill} ${STATUS[src.status].cls}`}>{STATUS[src.status].label}</span></span>
                    {src.where && <small>{src.where}</small>}
                    <blockquote>{src.quote}</blockquote>
                  </div>
                ))}
                {current.result.why.fix && (
                  <div className={t.fixBox}>
                    <b>Wrong or missing?</b>
                    <p>{current.result.why.fix.text}</p>
                    <Link className={`${a.btn} ${a.btnSm} ${a.btnGhost}`} href={current.result.why.fix.href}>{current.result.why.fix.label}</Link>
                  </div>
                )}
              </div>
            ) : (
              <div className={t.why}><span className={t.kicker}>Why it answered this</span><p>Ask a question, then click the answer to see which sources it read and how sure it was.</p></div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
