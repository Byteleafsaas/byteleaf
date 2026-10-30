'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { ICON, PathIcon } from '@/components/admin/icons';
import { Avatar, PillTabs, SearchBox, StatusPill, TopBar } from '@/components/admin/Ui';
import s from '@/components/admin/admin.module.css';
import { fmtDay } from '@/lib/admin/format';
import { useAdmin } from '@/lib/admin/store';
import type { Booking, BookingStatus } from '@/lib/admin/types';
import { closeBookingAction, confirmBookingAction, rescheduleBookingAction } from '@/lib/server/actions/bookings';

type Tab = 'pending' | 'upcoming' | 'past' | 'cancelled' | 'all';
const TABS: [Tab, string][] = [['pending', 'Pending'], ['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled'], ['all', 'All']];
const GROUPS: Record<Tab, (b: Booking) => boolean> = {
  pending: (b) => b.status === 'pending',
  upcoming: (b) => b.status === 'confirmed' || b.status === 'rescheduled',
  past: (b) => b.status === 'completed',
  cancelled: (b) => b.status === 'cancelled',
  all: () => true,
};

export default function BookingsView() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { bookings, setBookings, notify, availability, refresh } = useAdmin();
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && tabParam in GROUPS ? tabParam : 'pending';
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(params.get('id') ?? bookings.find(GROUPS[tab])?.id ?? null);
  const [mode, setMode] = useState<'view' | 'resched' | 'cancel'>('view');
  const [nd, setNd] = useState<string | null>(null);
  const [nt, setNt] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const rows = bookings.filter(GROUPS[tab]).filter((b) => !q.trim() || `${b.name} ${b.company}`.toLowerCase().includes(q.trim().toLowerCase()));
  const sel = bookings.find((b) => b.id === selId) ?? null;
  const first = sel?.name.split(' ')[0] ?? '';
  // The next 10 days with a free slot for this meeting type (rules come from Settings › Availability).
  const days = sel ? Object.keys(availability).filter((d) => availability[d][sel.meetingType]?.length).slice(0, 10) : [];
  const times = (sel && nd && availability[nd]?.[sel.meetingType]) || [];

  useEffect(() => {
    if (sel && mode === 'view') headingRef.current?.focus({ preventScroll: true });
  }, [selId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTab = (t: Tab) => {
    router.replace(`/admin/bookings?tab=${t}`);
    setMode('view');
  };
  const pick = (id: string) => {
    setSelId(id);
    setMode('view');
    setNd(null);
    setNt(null);
  };
  const patch = (id: string, p: Partial<Booking>, toast: string) => {
    setBookings((all) => all.map((b) => (b.id === id ? { ...b, ...p } : b)));
    setMode('view');
    setNd(null);
    setNt(null);
    notify(toast);
    requestAnimationFrame(() => openerRef.current?.focus());
  };
  const startMode = (m: 'resched' | 'cancel', el: HTMLButtonElement) => {
    openerRef.current = el;
    if (m === 'resched') setMsg(`Hi ${first}, something came up on our side — would this new time work for you? Sorry for the change.`);
    setMode(m);
  };
  const back = () => {
    setMode('view');
    setNd(null);
    setNt(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  };

  const isPending = sel?.status === 'pending';
  const canAct = !!sel && (['pending', 'confirmed', 'rescheduled'] as BookingStatus[]).includes(sel.status);
  const cancelLabel = isPending ? 'Decline' : 'Cancel booking';
  const hist = (text: string) => ({ text, when: 'Just now' });

  const run = async (p: Promise<{ ok: boolean; error?: string }>) => {
    const r = await p;
    if (!r.ok) notify(r.error ?? 'Something went wrong.');
    refresh(); // adopt the database state (also undoes the optimistic change if it failed)
  };
  const confirm = () => {
    if (!sel) return;
    patch(sel.id, { status: 'confirmed', history: [...sel.history, hist('Confirmed by Gerald')] }, `Booking confirmed — ${sel.name} has been emailed a calendar invite.`);
    void run(confirmBookingAction(sel.id));
  };
  const sendResched = (e: FormEvent) => {
    e.preventDefault();
    if (!sel || !nd || !nt) return;
    patch(sel.id, { status: 'rescheduled', date: nd, time: nt, history: [...sel.history, hist(`Rescheduled to ${fmtDay(nd)}, ${nt}`)] }, `New time sent to ${sel.name} — ${fmtDay(nd)} at ${nt}.`);
    void run(rescheduleBookingAction({ id: sel.id, date: nd, time: nt, message: msg }));
  };
  const doCancel = (e: FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    const reason = String(new FormData(e.currentTarget as HTMLFormElement).get('reason') ?? '');
    patch(sel.id, { status: 'cancelled', history: [...sel.history, hist(`${isPending ? 'Declined' : 'Cancelled'} by Gerald`)] }, `${sel.name} has been notified.`);
    void run(closeBookingAction({ id: sel.id, reason }));
  };

  return (
    <>
      <TopBar crumb="Admin / Bookings" title="Bookings">
        <SearchBox label="Search bookings" placeholder="Search name or company…" value={q} onChange={setQ} />
        <Link className={`${s.btn} ${s.btnGhost}`} href="/admin/settings?tab=availability">
          <PathIcon d={ICON.clock} />
          Availability
        </Link>
      </TopBar>

      <div className={s.content}>
        <PillTabs label="Filter bookings" value={tab} onChange={setTab} tabs={TABS.map(([key, label]) => ({ key, label, count: bookings.filter(GROUPS[key]).length }))} />

        <div className={s.panes}>
          <section className={`${s.panel} ${s.rise} ${s.ov}`} aria-label="Booking list" style={{ flex: '999 1 480px', minWidth: 0 }}>
            <div className={s.listHead}>
              <span style={{ flex: 1 }}>CLIENT</span>
              <span style={{ width: 150 }}>WHEN (SAST)</span>
              <span style={{ width: 104 }}>STATUS</span>
            </div>
            {rows.length ? (
              <ul className={s.ul}>
                {rows.map((b) => (
                  <li key={b.id}>
                    <button type="button" className={s.row} aria-pressed={b.id === selId} onClick={() => pick(b.id)}>
                      <Avatar name={b.name} />
                      <span className={s.rowMain}>
                        <span className={s.rowTitle}>{b.name}</span>
                        <span className={s.rowSub}>{b.company} · {b.typeLabel}</span>
                      </span>
                      <span className={s.col} style={{ width: 150, gap: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{fmtDay(b.date)}</span>
                        <span className={s.monoSm}>{b.time} · {b.durationMin} min</span>
                      </span>
                      <span style={{ width: 104 }}><StatusPill status={b.status} /></span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={s.emptyBox}>
                <strong>Nothing here</strong>
                <span>No bookings match this filter.</span>
              </div>
            )}
          </section>

          {sel && (
            <aside className={`${s.panel} ${s.slideIn} ${s.detail}`} aria-label="Booking details" key={sel.id}>
              <div className={s.detailHead}>
                <div className={s.detailTop}>
                  <Avatar name={sel.name} large />
                  <div className={s.detailName}>
                    <h2 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>{sel.name}</h2>
                    <span>{sel.company}</span>
                  </div>
                  <StatusPill status={sel.status} />
                </div>
                <div className={s.chips}>
                  <a className={`${s.btn} ${s.btnGhost} ${s.btnXs}`} href={`mailto:${sel.email}`}><PathIcon d={ICON.mail} size={16} />{sel.email}</a>
                  <a className={`${s.btn} ${s.btnGhost} ${s.btnXs}`} href={`tel:${sel.phone.replace(/\s/g, '')}`}><PathIcon d={ICON.phone} size={16} />{sel.phone}</a>
                </div>
              </div>

              {mode === 'view' && (
                <div className={s.detailBody}>
                  <dl className={s.dl}>
                    <div><dt className={s.mini}>MEETING</dt><dd>{sel.typeLabel}</dd></div>
                    <div><dt className={s.mini}>WHERE</dt><dd>{sel.where}</dd></div>
                    <div><dt className={s.mini}>DATE</dt><dd>{fmtDay(sel.date)}</dd></div>
                    <div><dt className={s.mini}>TIME</dt><dd>{sel.time} SAST · {sel.durationMin} min</dd></div>
                  </dl>
                  <div className={s.fg}>
                    <span className={s.mini}>CLIENT&apos;S NOTE</span>
                    <p className={s.noteBox}>{sel.note}</p>
                  </div>
                  <div className={s.fg} style={{ gap: 10 }}>
                    <span className={s.mini}>HISTORY</span>
                    <ol className={s.history}>
                      {sel.history.map((h, i) => (
                        <li key={i}><span>{h.text}</span><span className={s.monoSm} style={{ whiteSpace: 'nowrap' }}>{h.when}</span></li>
                      ))}
                    </ol>
                  </div>
                  {canAct && (
                    <div className={s.actionsRow}>
                      {isPending && <button type="button" className={`${s.btn} ${s.btnPrimary}`} style={{ flex: '1 1 140px' }} onClick={confirm}>Confirm booking</button>}
                      <button type="button" className={`${s.btn} ${s.btnGhost}`} style={{ flex: '1 1 120px' }} onClick={(e) => startMode('resched', e.currentTarget)}>Reschedule</button>
                      <button type="button" className={`${s.btn} ${s.btnDanger}`} style={{ flex: '1 1 100px' }} onClick={(e) => startMode('cancel', e.currentTarget)}>{cancelLabel}</button>
                    </div>
                  )}
                </div>
              )}

              {mode === 'resched' && (
                <form onSubmit={sendResched} className={`${s.formCol} ${s.slideIn}`}>
                  <div className={s.fg} style={{ gap: 4 }}>
                    <h3>Propose a new time</h3>
                    <span className={s.sub}>Currently {fmtDay(sel.date)} at {sel.time}. The client gets an email with the new time.</span>
                  </div>
                  <fieldset className={s.fieldset}>
                    <legend className={`${s.mini} ${s.legend}`}>DAY</legend>
                    <div className={`${s.pickGrid} ${s.pickDays}`}>
                      {days.map((d) => (
                        <button key={d} type="button" className={s.pick} aria-pressed={nd === d} onClick={() => setNd(d)}>{fmtDay(d)}</button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className={s.fieldset}>
                    <legend className={`${s.mini} ${s.legend}`}>TIME (SAST)</legend>
                    <div className={`${s.pickGrid} ${s.pickTimes}`}>
                      {times.map((t) => (
                        <button key={t} type="button" className={s.pick} aria-pressed={nt === t} onClick={() => setNt(t)}>{t}</button>
                      ))}
                    </div>
                  </fieldset>
                  <div className={s.fg}>
                    <label htmlFor="rmsg" className={s.label}>Message to {first} <i>(optional)</i></label>
                    <textarea id="rmsg" className={`${s.field} ${s.area}`} rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
                  </div>
                  <div className={s.btnRow}>
                    <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={back}>Back</button>
                    <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ flex: '1 1 160px' }} disabled={!(nd && nt)}>Send new time</button>
                  </div>
                </form>
              )}

              {mode === 'cancel' && (
                <form onSubmit={doCancel} className={`${s.formCol} ${s.slideIn}`}>
                  <div className={s.warnBox} role="alert">
                    <PathIcon d={ICON.warn} size={20} sw={2} />
                    <span>{first} will be told the {sel.typeLabel} on {fmtDay(sel.date)} is {isPending ? 'declined' : 'cancelled'}. This can&apos;t be undone.</span>
                  </div>
                  <div className={s.fg}>
                    <label htmlFor="cmsg" className={s.label}>Reason for the client <i>(optional)</i></label>
                    <textarea id="cmsg" name="reason" className={`${s.field} ${s.area}`} rows={3} placeholder="e.g. We're fully booked that week — please pick another time." />
                  </div>
                  <div className={s.btnRow}>
                    <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={back}>Keep booking</button>
                    <button type="submit" className={`${s.btn} ${s.btnDangerSolid}`} style={{ flex: '1 1 160px' }}>{cancelLabel}</button>
                  </div>
                </form>
              )}
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
