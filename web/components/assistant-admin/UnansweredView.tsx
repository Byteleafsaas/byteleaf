'use client';

import { useState } from 'react';
import { PathIcon } from '@/components/admin/icons';
import { TopBar } from '@/components/admin/Ui';
import { useAdmin } from '@/lib/admin/store';
import { addAnswerAction, askAgainAction, setUnansweredStatusAction } from '@/lib/server/actions/assistant-tools';
import type { TestResult } from '@/lib/server/assistant/engine';
import type { UnansweredData, UnansweredRow } from '@/lib/server/assistant/unanswered';
import a from '@/components/admin/admin.module.css';
import s from './assistant.module.css';
import t from './tools.module.css';

type Tab = 'open' | 'done' | 'ignored';
const MAX = 600;
const tz = 'Africa/Johannesburg';

function lastAsked(iso: string): string {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: tz });
  if (day(d) === day(new Date())) return `today ${d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}`;
  if (day(d) === day(new Date(Date.now() - 86400000))) return 'yesterday';
  return d.toLocaleDateString('en-GB', { timeZone: tz, day: 'numeric', month: 'short' });
}

export default function UnansweredView({ initial }: { initial: UnansweredData }) {
  const { notify } = useAdmin();
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>('open');
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [staffOnly, setStaffOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [again, setAgain] = useState<{ question: string; result: TestResult } | null>(null);
  const [againBusy, setAgainBusy] = useState(false);

  const rows = data.rows.filter((r) => r.status === tab);

  const open = (r: UnansweredRow) => { setEditing(r.id); setText(''); setStaffOnly(false); setError(''); };
  async function publish(r: UnansweredRow) {
    setBusy(true); setError('');
    const res = await addAnswerAction({ id: r.id, text, staffOnly }).catch(() => ({ ok: false as const, error: 'That didn’t save. Check your connection and try again.' }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setData(res.data); setEditing(null);
    notify('Answer published. It’s live now.');
    void check(r.question);
  }
  async function status(r: UnansweredRow, to: 'open' | 'ignored') {
    const res = await setUnansweredStatusAction(r.id, to);
    if (res.ok) { setData(res.data); notify(to === 'ignored' ? 'Question ignored' : 'Moved back to Open'); } else notify(res.error);
  }
  async function check(question: string) {
    setAgainBusy(true); setTab('done');
    const res = await askAgainAction(question).catch(() => null);
    setAgainBusy(false);
    if (res?.ok) setAgain({ question, result: res.result });
  }

  const answerText = (r: TestResult) => [r.answer.text, ...(r.answer.list ?? [])].join(' ');

  return (
    <>
      <TopBar crumb="Khumalo Home Solar / Knowledge" title="Unanswered questions">
        <span className={t.hint}>Last 30 days · similar questions are grouped</span>
      </TopBar>
      <div className={s.page}>
        <div className={t.stats}>
          <div className={`${a.panel} ${t.stat}`}><b>{data.stats.needAnswer}</b><span>question{data.stats.needAnswer === 1 ? '' : 's'} need an answer</span></div>
          <div className={`${a.panel} ${t.stat}`}><b>{data.stats.customers}</b><span>customers asked them</span></div>
          <div className={`${a.panel} ${t.stat}`}><b>{data.stats.handovers}</b><span>went on to ask for a person</span></div>
        </div>

        <div className={t.uGrid}>
          <section className={`${a.panel} ${t.uList}`} aria-label="Questions">
            <div className={t.uTabs} role="tablist" aria-label="Filter questions">
              {(['open', 'done', 'ignored'] as Tab[]).map((k) => (
                <button key={k} type="button" role="tab" className={a.tab} aria-selected={tab === k} onClick={() => setTab(k)}>
                  {{ open: 'Open', done: 'Answered', ignored: 'Ignored' }[k]}<span className={a.count}>{data.tabs[k]}</span>
                </button>
              ))}
            </div>

            {rows.map((r) => (
              <div key={r.id} className={`${t.uRow} ${editing === r.id ? t.uOpen : ''}`}>
                <div className={t.uTop}>
                  <h3>&ldquo;{r.question}&rdquo;</h3>
                  {editing !== r.id && (
                    <div className={a.btnRow}>
                      {r.status === 'open' && <><button type="button" className={`${a.btn} ${a.btnSm} ${a.btnGhost}`} onClick={() => status(r, 'ignored')}>Ignore</button>
                      <button type="button" className={`${a.btn} ${a.btnSm} ${a.btnPrimary}`} onClick={() => open(r)}><PathIcon d="M12 5v14M5 12h14" size={16} />Add answer</button></>}
                      {r.status === 'done' && <button type="button" className={`${a.btn} ${a.btnSm} ${a.btnGhost}`} disabled={againBusy} onClick={() => check(r.question)}>Ask it again</button>}
                      {r.status === 'ignored' && <button type="button" className={`${a.btn} ${a.btnSm} ${a.btnGhost}`} onClick={() => status(r, 'open')}>Move back to Open</button>}
                    </div>
                  )}
                </div>
                <div className={t.uMeta}>
                  <span className={`${t.pill} ${r.status === 'open' ? t.pillOpen : r.status === 'done' ? t.pillDone : t.pillIgn}`}>{r.status === 'open' ? 'Needs an answer' : r.status === 'done' ? 'Answered' : 'Ignored'}</span>
                  <span>Asked {r.count} time{r.count === 1 ? '' : 's'} · last {lastAsked(r.lastAskedAt)} · {r.handovers > 0 ? 'handed over' : 'didn’t know'}</span>
                </div>
                {r.alsoAsked.length > 0 && <div className={t.also}>Also asked as {r.alsoAsked.map((x) => <span key={x} className={t.chip}>{x}</span>)}</div>}

                {editing === r.id && (
                  <form className={t.editor2} onSubmit={(e) => { e.preventDefault(); void publish(r); }}>
                    <span className={t.edTop}><label htmlFor="ans">Your answer</label><span>{text.length} / {MAX}</span></span>
                    <textarea id="ans" className={`${a.field} ${t.textarea}`} rows={5} maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write the answer a customer should get." autoFocus />
                    <span className={t.hint}>Keep it short and specific. Prices and times are fine; personal details are not.</span>
                    <fieldset className={t.vis}>
                      <legend>Who can get this answer?</legend>
                      <label className={t.visOpt}><input type="radio" name="who" checked={!staffOnly} onChange={() => setStaffOnly(false)} /><span><b>Customers and staff</b><span>The public widget and staff mode</span></span></label>
                      <label className={t.visOpt}><input type="radio" name="who" checked={staffOnly} onChange={() => setStaffOnly(true)} /><span><b>Staff only</b><span>Customers get a handover instead</span></span></label>
                    </fieldset>
                    {error && <div className={t.err} role="alert"><PathIcon d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" size={18} /><span>{error}</span></div>}
                    <div className={t.uFoot}>
                      <span>Saved to <strong>Typed answers</strong>. Your words are used as written. They skip AI cleaning and review.</span>
                      <div className={a.btnRow}>
                        <button type="button" className={`${a.btn} ${a.btnGhost}`} onClick={() => setEditing(null)}>Cancel</button>
                        <button type="submit" className={`${a.btn} ${a.btnPrimary}`} disabled={busy || text.trim().length < 10}>{busy ? 'Publishing…' : 'Publish answer'}</button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            ))}
            {rows.length === 0 && (
              <div className={s.empty}><b>{tab === 'open' ? 'Nothing waiting' : tab === 'done' ? 'No answered questions yet' : 'Nothing ignored'}</b><span className={s.hint}>{tab === 'open' ? 'When the assistant can’t answer something, it shows up here.' : 'Questions you move here will be listed.'}</span></div>
            )}
          </section>

          <aside className={`${a.panel} ${t.uSide}`} aria-label="Ask it again">
            <div className={t.againHead}><span className={t.cAvatar} aria-hidden="true">K</span><div><b>Ask it again</b><small>Live assistant · test chat</small></div></div>
            <div className={t.againBody} aria-live="polite">
              {againBusy ? <p className={t.empty2}>Asking…</p> : again ? (
                <>
                  <div className={t.bUser}>{again.question}</div>
                  <div className={t.bBot} style={{ cursor: 'default' }}>{answerText(again.result)}</div>
                  <span className={t.outcome}><span className={`${t.pill} ${again.result.answer.kind === 'answer' ? t.oAns : t.oUnk}`}>{again.result.answer.kind === 'answer' ? 'ANSWERED' : "STILL DIDN'T KNOW"}</span></span>
                </>
              ) : <p className={t.empty2}>Publish an answer, then click &ldquo;Ask it again&rdquo; to check the assistant now gets it right.</p>}
            </div>
            <div className={t.handovers}>
              <b>Handovers caused by these questions</b>
              {data.stats.handovers} customer{data.stats.handovers === 1 ? '' : 's'} used &ldquo;Talk to a person&rdquo; after one of these. Answering the top two would have covered {data.topTwoHandovers} of them.
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
