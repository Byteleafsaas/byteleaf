'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ListSelect from '@/components/ListSelect';
import { PillTabs, SearchBox, TopBar } from '@/components/admin/Ui';
import { PathIcon } from '@/components/admin/icons';
import { useAdmin } from '@/lib/admin/store';
import type { SourceRow, SourceStatus } from '@/lib/server/assistant/admin';
import { deleteSourceAction, listSourcesAction, setSourceStaffOnlyAction } from '@/lib/server/actions/assistant-admin';
import a from '@/components/admin/admin.module.css';
import s from './assistant.module.css';

const WEB = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18';
const FILE = 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5';
const TYPED = 'M4 6h16M4 12h10M4 18h7';
const DB = 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6';
const INFO = 'M12 16v-4M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z';
const TYPE_ICON = { web: WEB, file: FILE, typed: TYPED } as const;
const ICO_CLASS = { web: s.icoWeb, file: s.icoFile, typed: s.icoTyped } as const;

const LABEL: Record<SourceStatus, string> = { live: 'Live', review: 'Needs review', partly: 'Partly reviewed', processing: 'Processing', failed: 'Failed', nothing: 'Nothing found' };
const PILL: Record<SourceStatus, string> = { live: s.live, review: s.review, partly: s.review, processing: s.busy, failed: s.failed, nothing: s.nothing };

type Tab = 'all' | 'live' | 'review' | 'processing' | 'problems';
const TYPES = ['All types', 'Web page', 'File', 'Typed'];
const TYPE_OF = { 'Web page': 'web', File: 'file', Typed: 'typed' } as const;

const tz = 'Africa/Johannesburg';
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz });
function fmtUpdated(iso: string): string {
  const d = new Date(iso);
  const ago = Date.now() - d.getTime();
  if (ago < 90 * 1000) return 'Just now';
  const today = dayKey(new Date());
  if (dayKey(d) === today) return `Today, ${d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}`;
  if (dayKey(d) === dayKey(new Date(Date.now() - 86400000))) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { timeZone: tz, day: 'numeric', month: 'short' });
}

/** "Couldn't read this file. It is a scanned image..." becomes a bold first sentence and the rest. */
function noteParts(r: SourceRow) {
  if (r.status === 'nothing') return { title: 'Nothing useful found.', text: r.problem };
  const i = r.problem.search(/[.!?](\s|$)/);
  return i === -1 ? { title: '', text: r.problem } : { title: r.problem.slice(0, i + 1), text: r.problem.slice(i + 2) };
}

export default function SourcesView({ initial, waiting }: { initial: SourceRow[]; waiting: number }) {
  const { notify } = useAdmin();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<Tab>('all');
  const [type, setType] = useState(TYPES[0]);
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await listSourcesAction('khumalo');
    if (res.ok) setRows(res.rows);
  }, []);

  // While anything is being read, check on it every two seconds.
  const busy = rows.some((r) => r.status === 'processing');
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [busy, refresh]);

  // Close the actions menu on outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const down = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) { setMenu(null); setConfirm(null); } };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setConfirm(null); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [menu]);

  const tabOf = (r: SourceRow): Tab => (r.status === 'live' ? 'live' : r.status === 'review' || r.status === 'partly' ? 'review' : r.status === 'processing' ? 'processing' : 'problems');
  const tabs = useMemo(
    () => (['all', 'live', 'review', 'processing', 'problems'] as Tab[]).map((k) => ({ key: k, label: { all: 'All', live: 'Live', review: 'Needs review', processing: 'Processing', problems: 'Problems' }[k], count: k === 'all' ? rows.length : rows.filter((r) => tabOf(r) === k).length })),
    [rows],
  );
  const shown = rows.filter((r) => (tab === 'all' || tabOf(r) === tab) && (type === TYPES[0] || r.type === TYPE_OF[type as keyof typeof TYPE_OF]) && (!q.trim() || `${r.name} ${r.typeLabel}`.toLowerCase().includes(q.trim().toLowerCase())));

  const remove = async (r: SourceRow) => {
    const res = await deleteSourceAction(r.id);
    setMenu(null); setConfirm(null);
    if (res.ok) { setRows((x) => x.filter((y) => y.id !== r.id)); notify(`Deleted ${r.name}`); } else notify(res.error);
  };
  const toggleStaff = async (r: SourceRow) => {
    const res = await setSourceStaffOnlyAction(r.id, !r.staffOnly);
    setMenu(null);
    if (res.ok) { setRows((x) => x.map((y) => (y.id === r.id ? { ...y, staffOnly: !r.staffOnly } : y))); notify(r.staffOnly ? `${r.name} is now visible to customers once live` : `${r.name} is now staff only`); } else notify(res.error);
  };

  const empty = rows.length === 0;
  return (
    <>
      <TopBar crumb="Khumalo Home Solar / Knowledge" title="Knowledge sources">
        {!empty && <SearchBox label="Search sources" placeholder="Search sources…" value={q} onChange={setQ} />}
        <Link className={`${a.btn} ${a.btnPrimary}`} href="/admin/assistant/sources/new"><PathIcon d="M12 5v14M5 12h14" size={18} />Add a source</Link>
      </TopBar>

      <div className={s.page}>
        {empty ? (
          <section className={`${a.panel} ${s.emptyCard}`} aria-labelledby="empty-h">
            <span className={s.emptyIco} aria-hidden="true"><PathIcon d={DB} size={34} /></span>
            <h2 id="empty-h">Your assistant doesn&apos;t know anything yet</h2>
            <p>Give it the information you already have. AI tidies it into short, clear items, and nothing goes live until you&apos;ve checked it.</p>
            <div className={s.routes}>
              {[{ via: 'website', icon: WEB, t: 'Add a website', d: 'Read your services, prices and FAQs straight from your site.' }, { via: 'upload', icon: 'M12 16V4M7 9l5-5 5 5M4 20h16', t: 'Upload files', d: 'PDF, Word or text files you already have.' }, { via: 'type', icon: TYPED, t: 'Type or paste', d: 'Quick facts and answers, written by you.' }].map((r) => (
                <Link key={r.via} className={s.route} href={`/admin/assistant/sources/new?via=${r.via}`}>
                  <span className={s.routeIco}><PathIcon d={r.icon} size={22} /></span>
                  <b>{r.t}</b>
                  <span>{r.d}</span>
                </Link>
              ))}
            </div>
            <span className={s.hint}>Tip: start with your website. Most businesses have their prices and services there already.</span>
          </section>
        ) : (
          <>
            {waiting > 0 && (
              <div role="status" className={s.banner}>
                <span className={s.ai}>AI CLEANED</span>
                <p><strong>{waiting} item{waiting === 1 ? ' is' : 's are'} waiting for your approval.</strong> Nothing changes for customers until you publish.</p>
                <Link className={`${a.btn} ${a.btnSm} ${s.bannerBtn}`} href="/admin/assistant/review">Review now</Link>
              </div>
            )}

            <div className={s.filters}>
              <PillTabs label="Filter by status" tabs={tabs} value={tab} onChange={setTab} />
              <div className={s.typeSel}>
                <span id="type-l">Type</span>
                <ListSelect id="type" value={type} options={TYPES} onChange={setType} triggerClass={a.field} />
              </div>
            </div>

            <section className={`${a.panel} ${s.table}`} aria-label="Sources">
              <div className={`${s.thead} ${s.hideSm}`}>
                <span style={{ flex: '1 1 280px' }}>SOURCE</span><span className={s.cStatus}>STATUS</span><span className={s.cItems}>ITEMS</span><span className={s.cUpdated}>UPDATED</span><span className={s.cActions}>ACTIONS</span>
              </div>
              <ul className={s.list}>
                {shown.map((r) => {
                  const note = r.problem && (r.status === 'failed' || r.status === 'nothing') ? noteParts(r) : null;
                  return (
                    <li key={r.id} className={s.row}>
                      <div className={s.cSource}>
                        <span className={`${s.ico} ${ICO_CLASS[r.type]}`} aria-hidden="true"><PathIcon d={TYPE_ICON[r.type]} size={18} /></span>
                        <span className={s.sname}>
                          <b>{r.name}{r.staffOnly && <span className={`${s.pill} ${s.pillSm}`}>STAFF ONLY</span>}</b>
                          <span>{r.typeLabel}</span>
                        </span>
                      </div>
                      <div className={s.cStatus}>
                        <span className={`${s.pill} ${PILL[r.status]}`}>
                          {r.status === 'processing' && <svg className={s.spin} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>}
                          {r.status === 'partly' ? r.partly : LABEL[r.status]}
                        </span>
                        {r.status === 'processing' && (
                          <span className={s.bar} role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Processing ${r.name}`}><span className={s.barFill} style={{ width: `${Math.max(6, r.pct)}%` }} /></span>
                        )}
                      </div>
                      <span className={s.cItems}>{r.status === 'processing' ? '—' : r.items}</span>
                      <span className={s.cUpdated}>{fmtUpdated(r.updatedAt)}</span>
                      <span className={s.cActions}>
                        {(r.status === 'review' || r.status === 'partly') && <Link className={`${a.btn} ${a.btnSm} ${s.reviewBtn}`} href="/admin/assistant/review">Review</Link>}
                        {r.status === 'failed' && <Link className={`${a.btn} ${a.btnSm} ${a.btnGhost}`} href="/admin/assistant/sources/new">Replace</Link>}
                        {r.status === 'nothing' && <Link className={`${a.btn} ${a.btnSm} ${a.btnGhost}`} href="/admin/assistant/sources/new?via=website">Try another page</Link>}
                        <button type="button" className={a.iconBtn} aria-label={`More actions for ${r.name}`} aria-haspopup="menu" aria-expanded={menu === r.id} onClick={() => { setMenu(menu === r.id ? null : r.id); setConfirm(null); }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
                        </button>
                        {menu === r.id && (
                          <div className={s.menu} role="menu" ref={menuRef}>
                            {confirm === r.id ? (
                              <div className={s.menuConfirm}>
                                <span>Delete <strong>{r.name}</strong> and its {r.items} item{r.items === 1 ? '' : 's'}? This can&apos;t be undone.</span>
                                <div>
                                  <button type="button" className={`${a.btn} ${a.btnXs} ${a.btnDangerSolid}`} onClick={() => remove(r)}>Delete</button>
                                  <button type="button" className={`${a.btn} ${a.btnXs} ${a.btnGhost}`} onClick={() => setConfirm(null)}>Keep</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {(r.status === 'live' || r.status === 'review' || r.status === 'partly') && (
                                  <button type="button" role="menuitem" className={s.menuItem} onClick={() => toggleStaff(r)}>{r.staffOnly ? 'Make visible to customers' : 'Make staff only'}</button>
                                )}
                                <button type="button" role="menuitem" className={`${s.menuItem} ${s.menuDanger}`} onClick={() => setConfirm(r.id)}>Delete source</button>
                              </>
                            )}
                          </div>
                        )}
                      </span>
                      {note && (
                        <div className={`${s.note} ${r.status === 'failed' ? s.noteErr : s.noteInfo}`}>
                          <PathIcon d={r.status === 'failed' ? INFO : INFO} size={16} />
                          <span>{note.title && <strong>{note.title} </strong>}{note.text}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {shown.length === 0 && (
                <div className={s.empty}><b>No sources match</b><span className={s.hint}>Try another status or type, or clear the search.</span></div>
              )}
            </section>
            <span className={s.hint}>The assistant only uses items that are <strong>Live</strong>. Staff-only sources are never shown to customers.</span>
          </>
        )}
      </div>
    </>
  );
}
