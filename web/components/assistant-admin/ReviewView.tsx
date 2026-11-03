'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PathIcon } from '@/components/admin/icons';
import { TopBar } from '@/components/admin/Ui';
import { useAdmin } from '@/lib/admin/store';
import type { ReviewItem } from '@/lib/server/assistant/review';
import { approveItemAction, listReviewItemsAction, publishAction, rejectItemAction, reopenItemAction, resolveConflictAction } from '@/lib/server/actions/assistant-review';
import a from '@/components/admin/admin.module.css';
import s from './assistant.module.css';

type Kind = 'pending' | 'unsure' | 'conflict' | 'approved' | 'rejected';
type Filter = 'all' | 'todo' | 'flagged' | 'done';

const CHECK = 'M5 12l5 5L20 7';
const CLOSE = 'M6 6l12 12M18 6L6 18';
const WARN = 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z';
const DOT = 'M12 12h.01';
const SPARK = 'M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z';

const kindOf = (i: ReviewItem): Kind => (i.status === 'approved' ? 'approved' : i.status === 'rejected' ? 'rejected' : i.conflict ? 'conflict' : i.unsure ? 'unsure' : 'pending');
const META: Record<Kind, { text: string; dot: string; tone: string; icon: string; pill: string }> = {
  pending: { text: 'Needs review', dot: s.dPend, tone: s.tPend, icon: DOT, pill: s.review },
  unsure: { text: 'AI unsure · needs review', dot: s.dUnsure, tone: s.tUnsure, icon: DOT, pill: s.pillUnsure },
  conflict: { text: 'Conflict · choose one', dot: s.dConf, tone: s.tConf, icon: DOT, pill: s.pillConf },
  approved: { text: 'Approved', dot: s.dOk, tone: s.tOk, icon: CHECK, pill: s.pillOk },
  rejected: { text: 'Rejected', dot: s.dRej, tone: s.tRej, icon: CLOSE, pill: s.nothing },
};

function Cleaned({ item, editing, draft, setDraft }: { item: ReviewItem; editing: boolean; draft: string; setDraft: (v: string) => void }) {
  if (editing) {
    return (
      <>
        <label htmlFor="ed" className={s.sr}>Edit the cleaned answer</label>
        <textarea id="ed" className={`${a.field} ${s.editor}`} rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <span className={s.hint}>Editing marks this item as yours, so it is no longer shown as AI cleaned.</span>
      </>
    );
  }
  const i = item.unsurePhrase ? item.text.indexOf(item.unsurePhrase) : -1;
  return (
    <div className={`${s.cleaned} ${item.edited || !item.aiCleaned ? s.cleanedYours : ''}`}>
      {item.asks && <small>Answers questions like: <em>{item.asks}</em></small>}
      <p>
        {i === -1 ? item.text : (<>{item.text.slice(0, i)}<mark className="unsure" style={{ background: '#FDECC8', padding: '1px 3px', borderRadius: 4, borderBottom: '2px dotted #B45309' }}>{item.unsurePhrase}</mark>{item.text.slice(i + item.unsurePhrase.length)}</>)}
      </p>
    </div>
  );
}

export default function ReviewView({ initial }: { initial: ReviewItem[] }) {
  const { notify } = useAdmin();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>('all');
  const [curId, setCurId] = useState(initial.find((i) => i.status === 'pending')?.id ?? initial[0]?.id ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [pick, setPick] = useState<'mine' | 'other' | ''>('');
  const [guard, setGuard] = useState<string | null>(null); // the item the owner tried to open while editing
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<{ published: number; discarded: number; waiting: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const cur = items.find((i) => i.id === curId) ?? items[0];
  const approved = items.filter((i) => i.status === 'approved').length;
  const decided = items.filter((i) => i.status !== 'pending').length;
  const pct = items.length ? Math.round((decided / items.length) * 100) : 0;

  const counts = useMemo(() => ({
    all: items.length, todo: items.filter((i) => i.status === 'pending').length,
    flagged: items.filter((i) => i.status === 'pending' && (i.conflict || i.unsure)).length, done: decided,
  }), [items, decided]);
  const shown = items.filter((i) => filter === 'all' || (filter === 'todo' && i.status === 'pending') || (filter === 'flagged' && i.status === 'pending' && (i.conflict || i.unsure)) || (filter === 'done' && i.status !== 'pending'));
  const sources = [...new Set(shown.map((i) => i.source))];

  useEffect(() => { setPick(''); setEditing(false); }, [curId]);
  useEffect(() => {
    if (!confirm && !guard) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setConfirm(false); setGuard(null); } };
    document.addEventListener('keydown', key);
    modalRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => document.removeEventListener('keydown', key);
  }, [confirm, guard]);

  const go = (id: string) => {
    if (id === curId) return;
    if (editing && cur && draft.trim() !== cur.text) { setGuard(id); return; }
    setCurId(id);
  };
  const nextPending = (list: ReviewItem[], from: string) => {
    const idx = list.findIndex((i) => i.id === from);
    return [...list.slice(idx + 1), ...list.slice(0, idx)].find((i) => i.status === 'pending')?.id;
  };

  async function run(fn: () => Promise<{ ok: true; items: ReviewItem[] } | { ok: false; error: string }>, advance: boolean, from = curId) {
    setBusy(true);
    const res = await fn().catch(() => ({ ok: false as const, error: 'That didn’t save. Check your connection and try again.' }));
    setBusy(false);
    if (!res.ok) { notify(res.error); return false; }
    setItems(res.items);
    if (advance) setCurId(nextPending(res.items, from) ?? from);
    return true;
  }

  const approve = () => cur && run(() => approveItemAction({ id: cur.id, ...(editing ? { text: draft } : {}) }), true);
  const reject = () => cur && run(() => rejectItemAction(cur.id), true);
  const resolve = () => cur && pick && run(() => resolveConflictAction(cur.id, pick), true);
  const reopen = () => cur && run(() => reopenItemAction(cur.id), false);

  async function publish() {
    setBusy(true);
    const res = await publishAction().catch(() => null);
    setBusy(false);
    setConfirm(false);
    if (!res || !res.ok) { notify('Couldn’t publish. Please try again.'); return; }
    setPublished(res);
    const list = await listReviewItemsAction();
    if (list.ok) { setItems(list.items); setCurId(list.items[0]?.id ?? ''); }
  }

  if (!cur && !published) {
    return (
      <>
        <TopBar crumb="Khumalo Home Solar / Knowledge" title="Review & publish" />
        <div className={s.page}>
          <section className={`${a.panel} ${s.emptyCard}`}>
            <span className={s.emptyIco}><PathIcon d={CHECK} size={34} /></span>
            <h2>Nothing to review</h2>
            <p>Everything the assistant knows has been checked. Add a source to give it more to work with.</p>
            <Link className={`${a.btn} ${a.btnPrimary}`} href="/admin/assistant/sources/new">Add a source</Link>
          </section>
        </div>
      </>
    );
  }

  const kind = cur ? kindOf(cur) : 'pending';
  const m = META[kind];
  const decidedDone = cur && cur.status !== 'pending';
  const footHint = !cur ? '' : cur.conflict ? 'Pick the correct price, then confirm.' : editing ? 'You’re editing. Save to approve it with your wording.' : cur.status === 'approved' ? 'Approved. It goes live when you publish.' : cur.status === 'rejected' ? 'Rejected. It won’t be published.' : 'Nothing here is live until you publish.';

  return (
    <>
      <TopBar crumb="Khumalo Home Solar / Knowledge" title="Review & publish">
        <div className={s.revHead}>
          <div className={s.prog}>
            <span className={s.progTop}><b>{decided} of {items.length} reviewed</b><span className={s.mono}>{pct}%</span></span>
            <span className={s.progBar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Review progress"><span style={{ width: `${pct}%` }} /></span>
          </div>
          <button type="button" className={`${a.btn} ${a.btnPrimary}`} disabled={approved === 0 || busy} onClick={() => setConfirm(true)}>
            <PathIcon d="M12 19V5M5 12l7-7 7 7" size={18} />Publish {approved} item{approved === 1 ? '' : 's'}
          </button>
        </div>
      </TopBar>

      <div className={`${s.page} ${s.revGrid}`}>
        {published && (
          <div role="status" className={s.okBar}>
            <span className={s.tick}><PathIcon d={CHECK} size={18} /></span>
            <p><strong>Published.</strong> {published.published} item{published.published === 1 ? ' is' : 's are'} now live{published.discarded ? `, ${published.discarded} discarded` : ''}.{published.waiting ? ` ${published.waiting} still waiting for review stay hidden from customers.` : ''}</p>
            <Link className={`${a.btn} ${s.btnOk}`} href="/admin/assistant/test">Test the assistant</Link>
          </div>
        )}

        <section className={`${a.panel} ${s.listPanel}`} aria-label="Items to review">
          <div className={s.fchips}>
            {(['all', 'todo', 'flagged', 'done'] as Filter[]).map((f) => (
              <button key={f} type="button" className={s.fchip} aria-pressed={filter === f} onClick={() => setFilter(f)}>{{ all: 'All', todo: 'To do', flagged: 'Flagged', done: 'Done' }[f]}<span>{counts[f]}</span></button>
            ))}
          </div>
          <div className={s.itemScroll}>
            {sources.map((src) => (
              <div key={src} style={{ display: 'contents' }}>
                <span className={s.grp}>{src}</span>
                {shown.filter((i) => i.source === src).map((i) => {
                  const mk = META[kindOf(i)];
                  return (
                    <button key={i.id} type="button" className={s.irow} aria-current={i.id === cur?.id} onClick={() => go(i.id)}>
                      <span className={`${s.idot} ${mk.dot}`} aria-hidden="true"><PathIcon d={mk.icon} size={12} /></span>
                      <span className={s.itxt}><b>{i.title}</b><span className={mk.tone}>{mk.text}</span></span>
                    </button>
                  );
                })}
              </div>
            ))}
            {shown.length === 0 && <div className={s.empty}><b>Nothing here</b><span className={s.hint}>Try another filter.</span></div>}
          </div>
        </section>

        {cur && (
          <section className={`${a.panel} ${s.detailPanel}`} aria-labelledby="item-h">
            <div className={s.dHead}>
              <div><span className={s.where}>{cur.source}{cur.where ? ` · ${cur.where}` : ''}</span><h2 id="item-h">{cur.title}</h2></div>
              <span className={`${s.pill} ${m.pill}`}>{m.text}</span>
            </div>

            {cur.conflict && cur.status === 'pending' ? (
              <div className={s.conflict}>
                <div role="alert" className={s.alertBox}><PathIcon d={WARN} size={20} /><span><strong>Two sources disagree.</strong> The assistant won&apos;t quote either price until you choose which one is right.</span></div>
                <fieldset className={s.choices}>
                  <legend>Which price is correct?</legend>
                  {([['mine', cur.conflict.mine], ['other', cur.conflict.other]] as const).map(([key, c]) => (
                    <button key={key} type="button" className={s.choice} aria-pressed={pick === key} onClick={() => setPick(key)}>
                      <span className={s.src}>{c.source}{c.where ? ` · ${c.where}` : c.sourceType === 'web' ? ' · web page' : ''}</span>
                      <span className={s.price}>{c.price || '—'}</span>
                      <span className={s.quote}>&ldquo;{c.quote}&rdquo;</span>
                      <span className={s.meta}>{c.when}</span>
                    </button>
                  ))}
                </fieldset>
                <span className={s.hint}>The other source will be marked as outdated so it isn&apos;t used for prices again. You can update that document later.</span>
              </div>
            ) : (
              <>
                <div className={s.sides}>
                  <div className={s.side}>
                    <span className={s.sideLabel}>Original <span className={s.mono}>{cur.where}</span></span>
                    <div className={s.orig}>{cur.original || cur.text}</div>
                  </div>
                  <div className={s.side}>
                    <span className={s.sideLabel}>Cleaned {cur.aiCleaned && !cur.edited ? <span className={s.ai}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={SPARK} /></svg>AI CLEANED</span> : <span className={`${s.pill} ${s.pillSm}`}>{cur.edited ? 'EDITED BY YOU' : 'AS WRITTEN'}</span>}</span>
                    <Cleaned item={cur} editing={editing} draft={draft} setDraft={setDraft} />
                  </div>
                </div>
                {cur.unsure && !editing && <div className={s.unsureNote}><span className={s.ai}>AI UNSURE</span><span>{cur.unsure}</span></div>}
              </>
            )}

            <div className={s.dFoot}>
              <span className={s.hint}>{footHint}</span>
              <div className={a.btnRow}>
                {decidedDone ? (
                  <button type="button" className={`${a.btn} ${a.btnGhost}`} disabled={busy} onClick={reopen}>Move back to review</button>
                ) : cur.conflict ? (
                  <>
                    <button type="button" className={`${a.btn} ${a.btnDanger}`} disabled={busy} onClick={reject}>Reject</button>
                    <button type="button" className={`${a.btn} ${s.btnOk}`} disabled={!pick || busy} onClick={resolve}><PathIcon d={CHECK} size={18} />{pick ? 'Use this price' : 'Choose a price first'}</button>
                  </>
                ) : editing ? (
                  <>
                    <button type="button" className={`${a.btn} ${a.btnGhost}`} disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
                    <button type="button" className={`${a.btn} ${s.btnOk}`} disabled={busy || draft.trim().length < 5} onClick={approve}><PathIcon d={CHECK} size={18} />Save and approve</button>
                  </>
                ) : (
                  <>
                    <button type="button" className={`${a.btn} ${a.btnDanger}`} disabled={busy} onClick={reject}>Reject</button>
                    <button type="button" className={`${a.btn} ${a.btnGhost}`} disabled={busy} onClick={() => { setDraft(cur.text); setEditing(true); }}>Edit</button>
                    <button type="button" className={`${a.btn} ${s.btnOk}`} disabled={busy} onClick={approve}><PathIcon d={CHECK} size={18} />Approve</button>
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {confirm && (
        <div className={s.scrim} onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirm(false); }}>
          <div className={s.modal} role="alertdialog" aria-modal="true" aria-labelledby="pub-h" ref={modalRef}>
            <h2 id="pub-h">Publish {approved} item{approved === 1 ? '' : 's'}?</h2>
            <p>Customers will start getting answers from these items straight away.</p>
            <ul>
              <li>{approved} approved item{approved === 1 ? '' : 's'} go live</li>
              {items.some((i) => i.status === 'rejected') && <li>{items.filter((i) => i.status === 'rejected').length} rejected, discarded</li>}
              {counts.todo > 0 && <li>{counts.todo} still waiting for review, stay hidden</li>}
            </ul>
            <div className={`${a.btnRow}`}>
              <button type="button" className={`${a.btn} ${a.btnGhost}`} onClick={() => setConfirm(false)}>Not yet</button>
              <button type="button" className={`${a.btn} ${a.btnPrimary}`} disabled={busy} onClick={publish}>{busy ? 'Publishing…' : 'Publish now'}</button>
            </div>
          </div>
        </div>
      )}

      {guard && cur && (
        <div className={s.scrim} onMouseDown={(e) => { if (e.target === e.currentTarget) setGuard(null); }}>
          <div className={s.modal} role="alertdialog" aria-modal="true" aria-labelledby="g-h" ref={modalRef}>
            <h2 id="g-h">You have an unsaved edit</h2>
            <p>You changed the wording of &ldquo;{cur.title}&rdquo; but haven&apos;t saved it.</p>
            <div className={a.btnRow}>
              <button type="button" className={`${a.btn} ${a.btnGhost}`} onClick={() => { const to = guard; setGuard(null); setEditing(false); setCurId(to); }}>Discard edit</button>
              <button type="button" className={`${a.btn} ${s.btnOk}`} onClick={async () => { const to = guard; setGuard(null); const ok = await run(() => approveItemAction({ id: cur.id, text: draft }), false); if (ok) setCurId(to); }}>Approve and continue</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
