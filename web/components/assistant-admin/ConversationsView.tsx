'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ListSelect from '@/components/ListSelect';
import { SearchBox, TopBar } from '@/components/admin/Ui';
import { PathIcon } from '@/components/admin/icons';
import { useAdmin } from '@/lib/admin/store';
import { deleteConversationAction, listConversationsAction } from '@/lib/server/actions/assistant-conversations';
import type { ConversationsData, ConvoMessage, ConvoRow, Outcome } from '@/lib/server/assistant/conversations';
import a from '@/components/admin/admin.module.css';
import s from './assistant.module.css';
import c from './conversations.module.css';

type Filter = 'all' | 'notHelpful' | 'unknown' | 'handedOver';
const RANGES = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }];
const CHANNELS = ['All channels', 'Website', 'Staff'];
const OUT: Record<Outcome, { label: string; cls: string }> = {
  answered: { label: 'Answered', cls: c.pAnswered }, helpful: { label: 'Helpful', cls: c.pHelpful }, unknown: { label: "Didn't know", cls: c.pUnknown },
  notHelpful: { label: 'Not helpful', cls: c.pNot }, handedOver: { label: 'Handed over', cls: c.pHand }, refused: { label: 'Refused', cls: c.pRef },
};
const tz = 'Africa/Johannesburg';
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz });
const hm = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
function when(iso: string): string {
  const d = new Date(iso);
  if (dayKey(d) === dayKey(new Date())) return `Today ${hm(d)}`;
  if (dayKey(d) === dayKey(new Date(Date.now() - 86400000))) return `Yesterday ${hm(d)}`;
  return `${d.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short' })} ${hm(d)}`;
}

/** Turns [phone removed] style tokens into the small dark chips the log shows. */
function Text({ text }: { text: string }) {
  return <>{text.split(/(\[(?:email|phone|ID|number) removed\])/g).map((p, i) => (/^\[(email|phone|ID|number) removed\]$/.test(p) ? <span key={i} className={c.redacted}>{p}</span> : <Fragment key={i}>{p}</Fragment>))}</>;
}

function Flag({ m, row }: { m: ConvoMessage; row: ConvoRow }) {
  if (m.kind === 'unknown') return <div className={`${c.flag} ${c.fWarn}`}><span><strong>Didn&apos;t know.</strong> This question is in Unanswered, so you can add the missing answer.</span><Link href="/admin/assistant/unanswered">Open Unanswered</Link></div>;
  if (m.kind === 'off') return <div className={`${c.flag} ${c.fGrey}`}><span><strong>Refused.</strong> This is a topic the assistant hands over instead of answering.</span><Link href="/admin/assistant/settings">Change in Settings</Link></div>;
  if (m.kind === 'handover') return <div className={`${c.flag} ${c.fInfo}`}><span>{row.outcomes.includes('handedOver') ? 'Visitor opened the handover form. Their details are in Messages.' : 'The assistant pointed the visitor to the handover form.'}</span><Link href="/admin/messages">Open in Messages</Link></div>;
  if (m.rating === 'down') return <div className={`${c.flag} ${c.fWarn}`}><span><strong>Rated not helpful</strong>{m.reason ? ` · reason: ${m.reason}` : ''}. Check the source it used.</span><Link href="/admin/assistant/review">Fix in Review</Link></div>;
  return null;
}

export default function ConversationsView({ initial }: { initial: ConversationsData }) {
  const { notify } = useAdmin();
  const [data, setData] = useState(initial);
  const [days, setDays] = useState(initial.days);
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [curId, setCurId] = useState(initial.rows[0]?.id ?? '');
  const [confirm, setConfirm] = useState(false);
  const modal = useRef<HTMLDivElement>(null);

  const reload = useCallback(async (d: number) => {
    const res = await listConversationsAction(d);
    if (res.ok) { setData(res.data); setCurId((id) => (res.data.rows.some((r) => r.id === id) ? id : res.data.rows[0]?.id ?? '')); }
  }, []);

  useEffect(() => {
    if (!confirm) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirm(false); };
    document.addEventListener('keydown', key);
    modal.current?.querySelector<HTMLElement>('button')?.focus();
    return () => document.removeEventListener('keydown', key);
  }, [confirm]);

  const base = data.rows.filter((r) => (channel === 'All channels' || r.channel === (channel === 'Website' ? 'web' : 'staff')) && (!q.trim() || `${r.firstQuestion} ${r.messages.map((m) => m.text).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())));
  const counts = useMemo(() => ({ all: base.length, notHelpful: base.filter((r) => r.outcomes.includes('notHelpful')).length, unknown: base.filter((r) => r.outcomes.includes('unknown')).length, handedOver: base.filter((r) => r.outcomes.includes('handedOver')).length }), [base]);
  const shown = base.filter((r) => filter === 'all' || r.outcomes.includes(filter));
  const cur = shown.find((r) => r.id === curId) ?? shown[0];

  async function remove() {
    if (!cur) return;
    const res = await deleteConversationAction(cur.id);
    setConfirm(false);
    if (res.ok) { setData((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== cur.id) })); notify('Conversation deleted'); } else notify(res.error);
  }
  const clear = () => { setFilter('all'); setQ(''); setChannel(CHANNELS[0]); };

  return (
    <>
      <TopBar crumb="Khumalo Home Solar / Knowledge" title="Conversations">
        <div className={c.selects}>
          <ListSelect id="range" value={RANGES.find((r) => r.days === days)?.label ?? RANGES[0].label} options={RANGES.map((r) => r.label)} onChange={(v) => { const d = RANGES.find((r) => r.label === v)!.days; setDays(d); void reload(d); }} triggerClass={a.field} />
          <ListSelect id="chan" value={channel} options={CHANNELS} onChange={setChannel} triggerClass={a.field} />
        </div>
      </TopBar>

      <div className={s.page}>
        <div className={c.stats}>
          <div className={`${a.panel} ${c.stat}`}><b>{data.stats.total}</b><span>conversations, last {data.days} days</span></div>
          <div className={`${a.panel} ${c.stat}`}><b>{data.stats.answeredPct}%</b><span>answered from sources</span></div>
          <div className={`${a.panel} ${c.stat}`}><b>{data.stats.helpfulPct}%</b><span>of ratings were helpful</span></div>
          <div className={`${a.panel} ${c.stat}`}><b>{data.stats.handedOver}</b><span>handed over to the team</span></div>
        </div>

        <div className={c.priv}>
          <PathIcon d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z" size={18} />
          <span>Visitors are anonymous. Phone numbers, emails and ID numbers are removed before chats are saved, and chats are deleted after 30 days. Handover details live in <Link href="/admin/messages">Messages</Link>, not here.</span>
        </div>

        <div className={c.grid}>
          <section className={`${a.panel} ${c.listPanel}`} aria-label="Conversations">
            <div className={c.lHead}>
              <SearchBox label="Search what people asked" placeholder="Search what people asked" value={q} onChange={setQ} />
              <div className={c.chips}>
                {([['all', 'All'], ['notHelpful', 'Not helpful'], ['unknown', "Didn't know"], ['handedOver', 'Handed over']] as [Filter, string][]).map(([k, label]) => (
                  <button key={k} type="button" className={c.chip} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}<span>{counts[k]}</span></button>
                ))}
              </div>
            </div>
            <div className={c.items}>
              {shown.map((r) => (
                <button key={r.id} type="button" className={c.item} aria-current={r.id === cur?.id} onClick={() => setCurId(r.id)}>
                  <span className={c.itemTop}><b><Text text={r.firstQuestion} /></b><time dateTime={r.lastAt}>{when(r.lastAt)}</time></span>
                  <span className={c.pills}>
                    {r.outcomes.map((o) => <span key={o} className={`${c.pill} ${OUT[o].cls}`}>{OUT[o].label}</span>)}
                    <span>{r.visitor} · {r.messageCount} message{r.messageCount === 1 ? '' : 's'}</span>
                  </span>
                </button>
              ))}
              {shown.length === 0 && (
                <div className={c.empty}><b>No conversations match</b><span className={c.hint}>Try another filter, or clear them to see everything.</span><button type="button" className={`${a.btn} ${a.btnSm} ${a.btnGhost}`} onClick={clear}>Clear filters</button></div>
              )}
            </div>
          </section>

          {cur && (
            <section className={`${a.panel} ${c.tPanel}`} aria-labelledby="t-h">
              <div className={c.tHead}>
                <div>
                  <span className={c.meta}>{cur.visitor} · {cur.channel === 'web' ? 'Website' : 'Staff'} · {when(cur.startedAt)}</span>
                  <h2 id="t-h">&ldquo;<Text text={cur.firstQuestion} />&rdquo;</h2>
                </div>
                <button type="button" className={`${a.btn} ${a.btnSm} ${a.btnDanger}`} onClick={() => setConfirm(true)}><PathIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={16} />Delete</button>
              </div>
              <div className={c.log}>
                {cur.messages.map((m, i) => (
                  <Fragment key={i}>
                    <span className={`${c.who} ${m.role === 'user' ? c.whoRight : ''}`}>{m.role === 'user' ? cur.visitor : 'Assistant'} · {hm(new Date(m.at))}</span>
                    {m.role === 'user' ? <div className={c.bUser}><Text text={m.text} /></div> : <div className={c.bBot}>{m.text}</div>}
                    {m.role === 'assistant' && m.sources.map((src) => <span key={src} className={c.src}><PathIcon d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5" size={13} />{src}</span>)}
                    {m.role === 'assistant' && <Flag m={m} row={cur} />}
                  </Fragment>
                ))}
              </div>
              <div className={c.tFoot}>
                <span>Outcome: <b>{cur.outcomes.map((o) => OUT[o].label).join(', then ').replace(/^./, (x) => x)}</b></span>
                <span>Sources used: <b>{cur.sourcesUsed}</b></span>
                <span>Deleted automatically on <b>{new Date(cur.expiresAt).toLocaleDateString('en-GB', { timeZone: tz, day: 'numeric', month: 'short' })}</b></span>
              </div>
            </section>
          )}
        </div>
      </div>

      {confirm && cur && (
        <div className={c.scrim} onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirm(false); }}>
          <div className={c.modal} role="alertdialog" aria-modal="true" aria-labelledby="del-h" ref={modal}>
            <h2 id="del-h">Delete this conversation?</h2>
            <p>It&apos;s removed straight away and can&apos;t be brought back. Questions it created in Unanswered stay.</p>
            <div className={a.btnRow} style={{ justifyContent: 'flex-end' }}>
              <button type="button" className={`${a.btn} ${a.btnGhost}`} onClick={() => setConfirm(false)}>Keep it</button>
              <button type="button" className={`${a.btn} ${a.btnDangerSolid}`} onClick={remove}>Delete conversation</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
