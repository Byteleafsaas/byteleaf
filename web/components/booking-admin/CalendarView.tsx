'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PathIcon } from '@/components/admin/icons';
import { useBookingInfo } from '@/lib/admin/booking-info';
import { addBookingAction, cancelBookingAction, confirmBookingAction, moveBookingAction, noShowAction, retryReminderAction, undoAction } from '@/lib/server/actions/whatsapp-calendar';
import type { CalendarData } from '@/lib/server/whatsapp/calendar-admin';
import { PX_PER_MIN, STATUS_LABEL, freeMinutes, slotState, weekDates, type Booking } from '@/lib/whatsapp/calendar-model';
import { fmtDay, fmtLong } from '@/lib/whatsapp/copy';
import { addDays } from '@/lib/server/time';
import s from './booking.module.css';

export type View = 'day' | 'week' | 'list';
type Mode = 'view' | 'move' | 'new';
type Toast = { text: string; undo?: () => void };

const t = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const parse = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const PILL: Record<Booking['status'], string> = { confirmed: 'background: #E6F6EF; color: #0B6B4B;', unconfirmed: 'background: #FFF4E0; color: #8A5200;', noshow: 'background: #EEF2F8; color: #33405A;' };
const css = (x: string): React.CSSProperties => Object.fromEntries(x.split(';').map((p) => p.trim()).filter(Boolean).map((p) => { const [k, ...v] = p.split(':'); return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.join(':').trim()]; }));
const blockStyle = (b: Booking, past: boolean) => (b.status === 'noshow' ? css('background: #EEF2F8; color: #4B5872') : b.status === 'unconfirmed' ? css('background: #fff; border: 1.5px dashed #6B7891') : { background: 'var(--acc-soft)', boxShadow: 'inset 3px 0 0 var(--acc)', ...(past ? { opacity: 0.75 } : {}) });
const weekTitle = (d: string) => {
  const w = weekDates(d); const a = fmtDay(w[0]).split(' '); const z = fmtDay(w[6]).split(' ');
  return a[2] === z[2] ? `${a[1]} – ${z[1]} ${fmtLong(w[6]).split(' ')[2]} ${w[6].slice(0, 4)}` : `${a[1]} ${a[2]} – ${z[1]} ${z[2]} ${w[6].slice(0, 4)}`;
};

export default function CalendarView({ data, view, date, staff: staffFilter, selId }: { data: CalendarData; view: View; date: string; staff: string; selId: string }) {
  const router = useRouter();
  const info = useBookingInfo();
  const [mode, setMode] = useState<Mode>('view');
  const [width, setWidth] = useState(1440);
  const [nowMin, setNowMin] = useState(data.nowMin);
  const [mStaff, setMStaff] = useState(staffFilter !== 'all' ? staffFilter : data.staff[0]?.id ?? '');
  const [pick, setPick] = useState({ date, staffId: data.staff[0]?.id ?? '', time: -1, force: false });
  const [nb, setNb] = useState({ name: '', serviceId: data.services[data.services.length > 3 ? 3 : 0]?.id ?? '', err: '' });
  const [pickErr, setPickErr] = useState('');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [noShowJust, setNoShowJust] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const opener = useRef<HTMLElement | null>(null);

  const mobile = width <= 760;
  const g0 = data.g0;
  const gridH = (data.g1 - data.g0) * PX_PER_MIN;
  const yy = (min: number) => Math.round((min - g0) * PX_PER_MIN);
  const sel = data.bookings.find((b) => b.id === selId);
  const staffName = (id: string) => data.staff.find((p) => p.id === id)?.name ?? '';
  const isToday = date === data.today;

  useEffect(() => { const on = () => setWidth(window.innerWidth); on(); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  useEffect(() => { setNowMin(data.nowMin); const i = setInterval(() => { const x = new Date(Date.now() + 2 * 3600000); setNowMin(x.getUTCHours() * 60 + x.getUTCMinutes()); }, 60000); return () => clearInterval(i); }, [data.nowMin]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback((text: string, undo?: () => void) => { clearTimeout(timer.current); setToast({ text, undo }); timer.current = setTimeout(() => setToast(null), 5000); }, []);

  const go = useCallback((o: { view?: View; date?: string; staff?: string; id?: string }) => {
    const p = new URLSearchParams();
    const v = o.view ?? view;
    if (v !== 'day') p.set('view', v);
    p.set('date', o.date ?? date);
    const st = o.staff ?? staffFilter;
    if (st !== 'all') p.set('staff', st);
    const id = o.id === undefined ? '' : o.id;
    if (id) p.set('id', id);
    router.push(`/admin/bookings/calendar?${p.toString()}`, { scroll: false });
  }, [router, view, date, staffFilter]);

  const panelOpen = Boolean(sel) || mode === 'new';
  const closePanel = useCallback(() => { setMode('view'); setNoShowJust(false); go({ id: '' }); opener.current?.focus?.(); }, [go]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; if (cancelOpen) setCancelOpen(false); else if (panelOpen) closePanel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cancelOpen, panelOpen, closePanel]);
  // On phones the panel covers the screen, so the page behind it must not scroll.
  useEffect(() => { if (!(panelOpen && width <= 600)) return; const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, [panelOpen, width]);
  useEffect(() => { setMode('view'); setNoShowJust(false); }, [selId]);

  const openBlock = (b: Booking, el?: HTMLElement | null) => { opener.current = el ?? (document.activeElement as HTMLElement | null); setNoShowJust(false); go({ id: b.id, date: b.date }); };

  // What the grid shows
  const staffKeys = mobile ? [mStaff] : staffFilter === 'all' ? data.staff.map((p) => p.id) : [staffFilter];
  const day = data.days[date];
  const dayBk = data.bookings.filter((b) => b.date === date);
  const past = (b: Booking) => b.date < data.today || (b.date === data.today && b.e <= nowMin);

  const shadeFor = (d: string, sid: string) => {
    const info2 = data.days[d];
    const per = info2?.per[sid];
    const full = (l: string) => [{ y: 0, h: gridH, l }];
    if (!info2 || info2.closed) return full('Closed');
    if (per?.off) return full(per.off);
    const z: { y: number; h: number; l: string }[] = [];
    const r = per?.ranges ?? [];
    if (r.length && r[0][0] > data.g0) z.push({ y: 0, h: yy(r[0][0]), l: '' });
    r.forEach((x, i) => { if (r[i + 1]) z.push({ y: yy(x[1]), h: yy(r[i + 1][0]) - yy(x[1]), l: 'Break' }); });
    if (r.length && r[r.length - 1][1] < data.g1) z.push({ y: yy(r[r.length - 1][1]), h: yy(data.g1) - yy(r[r.length - 1][1]), l: `Closed from ${t(r[r.length - 1][1])}` });
    return z;
  };

  // Banner above the grid (day and list)
  let banner: { title: string; text: string; style: string } | null = null;
  if (view !== 'week' && day) {
    const working = data.staff.filter((p) => day.per[p.id]?.ranges.length);
    const wd = fmtLong(date).split(' ')[0];
    if (day.closed) banner = { title: 'Closed', text: `The salon is closed on ${wd}s. WhatsApp clients are offered the next open day.`, style: 'background: #EEF2F8; color: #33405A;' };
    else if (working.length && working.every((p) => freeMinutes(day.per[p.id].ranges, dayBk.filter((b) => b.staffId === p.id && b.status !== 'noshow').map((b) => ({ s: b.s, e: b.e + b.buf }))) < 60)) banner = { title: 'Fully booked.', text: `No open times left. WhatsApp clients asking for ${wd} are offered the next open day.`, style: 'background: #FFF4E0; color: #6B3F00;' };
    else { const off = data.staff.find((p) => day.per[p.id]?.off.startsWith('Time off')); if (off) banner = { title: `${off.name} is off today.`, text: 'Anything only she does can’t be booked.', style: 'background: #EEF4FE; color: #0B3A80;' }; }
  }

  // Move / new booking picker
  const pickOpen = mode === 'move' || mode === 'new';
  const svc = data.services.find((x) => x.id === nb.serviceId);
  const len = mode === 'move' && sel ? sel.e - sel.s : svc?.minutes ?? 60;
  const pickDay = data.days[pick.date];
  const pickInfo = pickDay?.per[pick.staffId];
  const busy = data.bookings.filter((b) => b.date === pick.date && b.staffId === pick.staffId && b.status !== 'noshow' && (mode !== 'move' || b.id !== sel?.id)).map((b) => ({ client: b.client, s: b.s, e: b.e + b.buf, end: b.e }));
  const slots = useMemo(() => {
    const out: { m: number; state: ReturnType<typeof slotState> }[] = [];
    for (let m = data.g0; m < data.g1; m += 30) out.push({ m, state: slotState({ ranges: pickInfo?.ranges ?? [], busy, start: m, length: len, nowMin: pick.date < data.today ? Infinity : pick.date === data.today ? nowMin : null }) });
    return out;
  }, [data.g0, data.g1, pickInfo, busy, len, pick.date, data.today, nowMin]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = pick.time >= 0 ? slots.find((x) => x.m === pick.time)?.state : undefined;
  const clash = chosen?.state === 'busy' ? chosen.clash : undefined;
  const cantSave = saving || Boolean(clash && !pick.force);
  const pickDays = data.dates.filter((d) => d >= data.today).slice(0, 14);

  const startPick = (m: 'move' | 'new') => {
    const first = pickDays.find((d) => !data.days[d].closed) ?? data.today;
    setPick({ date: m === 'move' && sel && sel.date >= data.today ? sel.date : isToday || date > data.today ? (data.days[date]?.closed ? first : date) : first, staffId: m === 'move' && sel ? sel.staffId : staffFilter !== 'all' ? staffFilter : data.staff[0]?.id ?? '', time: -1, force: false });
    setPickErr(''); setNb((n) => ({ ...n, err: '' })); setMode(m);
  };
  const openNew = () => { opener.current = document.activeElement as HTMLElement | null; startPick('new'); };

  const refresh = () => router.refresh();
  const told = (r: string, name: string) => (r === 'sent' ? ` ${name} has been told on WhatsApp.` : r === 'window-closed' ? ` ${name} wasn’t messaged: their 24-hour WhatsApp window has closed.` : r === 'not-connected' ? ' No message was sent: WhatsApp isn’t connected yet.' : r === 'no-number' ? ` ${name} has no WhatsApp number on file.` : r === 'failed' ? ' The WhatsApp message couldn’t be sent.' : '');

  const savePick = async (e: FormEvent) => {
    e.preventDefault();
    const noName = mode === 'new' && !nb.name.trim();
    if (noName || pick.time < 0) { setNb({ ...nb, err: noName ? 'Enter the client’s name.' : '' }); setPickErr(pick.time < 0 ? 'Pick a start time.' : ''); return; }
    if (cantSave) return;
    setSaving(true);
    const time = t(pick.time);
    if (mode === 'move' && sel) {
      const back = { date: sel.date, time: t(sel.s), staffId: sel.staffId };
      const r = await moveBookingAction({ id: sel.id, date: pick.date, time, staffId: pick.staffId, force: pick.force, notify });
      setSaving(false);
      if (!r.ok) { setPickErr(r.error); return; }
      setMode('view');
      flash(`Moved to ${fmtDay(pick.date)}, ${time}.${notify ? told(r.told, sel.client.split(' ')[0]) : ''}`, async () => { await undoAction('move', sel.id, back); flash('Undone.'); refresh(); });
      go({ id: sel.id, date: pick.date });
      refresh();
    } else {
      const r = await addBookingAction({ name: nb.name.trim(), serviceId: nb.serviceId, date: pick.date, time, staffId: pick.staffId, force: pick.force });
      setSaving(false);
      if (!r.ok) { setPickErr(r.error); return; }
      const name = nb.name.trim();
      setNb({ name: '', serviceId: nb.serviceId, err: '' });
      setMode('view');
      flash(`Booking added for ${name}.`, async () => { await undoAction('add', r.id); flash('Undone.'); closePanel(); refresh(); });
      go({ id: r.id, date: pick.date });
      refresh();
    }
  };

  const confirmBk = async () => { if (!sel) return; setSaving(true); const r = await confirmBookingAction(sel.id); setSaving(false); flash(r.ok ? 'Marked as confirmed.' : r.error); refresh(); };
  const noShow = async () => { if (!sel) return; const r = await noShowAction(sel.id); if (!r.ok) { flash(r.error); return; } setNoShowJust(true); refresh(); };
  const undoNoShow = async () => { if (!sel) return; await noShowAction(sel.id, true); setNoShowJust(false); refresh(); };
  const retry = async () => { if (!sel) return; const r = await retryReminderAction(sel.id); flash(r.ok ? 'Reminder will be sent again at the next run.' : r.error); refresh(); };
  const doCancel = async () => {
    if (!sel) return;
    const name = sel.client.split(' ')[0];
    const id = sel.id;
    const r = await cancelBookingAction(id, notify);
    setCancelOpen(false);
    if (!r.ok) { flash(r.error); return; }
    closePanel();
    flash(`Booking cancelled.${notify ? told(r.told, name) : ''}`, async () => { const u = await undoAction('cancel', id); flash(u.ok ? 'Undone.' : u.error); refresh(); });
    refresh();
  };

  const staffChips = (mobile ? [] : [{ id: 'all', name: 'Everyone' }]).concat(data.staff.map((p) => ({ id: p.id, name: p.name })));
  const title = view === 'week' ? weekTitle(date) : `${mobile ? fmtDay(date) : fmtLong(date)}${isToday ? ' · today' : ''}`;
  const unit = view === 'week' ? 'week' : 'day';
  const step = view === 'week' ? 7 : 1;
  const hourMarks = Array.from({ length: Math.floor((data.g1 - data.g0) / 60) + 1 }, (_, i) => ({ y: i === 0 ? 8 : yy(g0 + 60 * i), l: t(g0 + 60 * i) }));
  const showNow = isToday && nowMin >= data.g0 && nowMin <= data.g1;

  const blocksFor = (d: string, sid: string) => data.bookings.filter((b) => b.date === d && b.staffId === sid);
  const listBk = dayBk.filter((b) => staffFilter === 'all' || b.staffId === staffFilter).sort((a, b) => a.s - b.s);

  return (
    <div className={s.page}>
      {!info.numberOk && (
        <div role="alert" className={s.attention}>
          <PathIcon d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" size={18} sw={2} />
          <span style={{ flex: '1 1 320px' }}><strong>Your WhatsApp number needs attention.</strong> New messages, confirmations and reminders aren’t being sent. Bookings you add here still save.</span>
          <a className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href="#" style={{ color: '#6B3F00', borderColor: '#E9C46A' }}>Reconnect number</a>
        </div>
      )}

      <header className={s.calHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className={s.ibtn} aria-label={`Previous ${unit}`} onClick={() => go({ date: addDays(date, -step), id: '' })} style={{ border: '1px solid #D5DEEB', background: '#fff' }}><PathIcon d="M15 18l-6-6 6-6" size={18} sw={2.2} /></button>
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => go({ date: data.today, id: '' })}>Today</button>
          <button type="button" className={s.ibtn} aria-label={`Next ${unit}`} onClick={() => go({ date: addDays(date, step), id: '' })} style={{ border: '1px solid #D5DEEB', background: '#fff' }}><PathIcon d="M9 18l6-6-6-6" size={18} sw={2.2} /></button>
          <h1 aria-live="polite" style={{ margin: '0 0 0 6px', fontSize: 24, letterSpacing: '-0.03em', fontWeight: 600, whiteSpace: 'nowrap' }}>{title}</h1>
          <span className={`${s.mono} ${s.hideSm}`} style={{ fontSize: 11, color: '#4B5872' }}>SAST · UTC+2</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className={s.vseg} role="group" aria-label="View">
            {(['day', 'week', 'list'] as View[]).map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => go({ view: v, id: '' })}>{v[0].toUpperCase() + v.slice(1)}</button>)}
          </div>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={openNew}><PathIcon d="M12 5v14M5 12h14" size={16} sw={2.4} />New booking</button>
        </div>
      </header>

      <div className={s.calBody}>
        <div className={s.calPad}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div role="group" aria-label="Staff" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {staffChips.map((p) => <button key={p.id} type="button" className={s.chipb} aria-pressed={mobile ? mStaff === p.id : staffFilter === p.id} onClick={() => (mobile ? setMStaff(p.id) : go({ staff: p.id, id: '' }))}>{p.name}</button>)}
            </div>
            <div className={s.hideSm} style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12, color: '#4B5872' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PathIcon d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" size={14} sw={2} />Booked on WhatsApp</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 4, border: '1.5px dashed #6B7891', boxSizing: 'border-box' }} />Unconfirmed</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className={s.hatchBg} style={{ width: 14, height: 14, borderRadius: 4 }} />Break / closed</span>
            </div>
          </div>

          {banner && <div role="status" className={s.banner} style={css(banner.style)}><strong>{banner.title}</strong><span style={{ flex: '1 1 260px' }}>{banner.text}</span></div>}

          {!data.any && (
            <div className={`${s.panel} ${s.rise} ${s.empty}`}>
              <span className={s.emptyIcon} aria-hidden="true"><PathIcon d="M3 9h18M7 3v4M17 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" size={28} sw={2} /></span>
              <h2 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>No bookings yet</h2>
              <p style={{ margin: 0, maxWidth: 460, fontSize: 15, lineHeight: 1.55, color: '#4B5872' }}>When clients book on WhatsApp, their appointments appear here straight away. Finish these three things and you’re ready.</p>
              <ol style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                {[{ done: true, label: 'Connect your WhatsApp number' }, { done: data.setup.services, label: 'Add your services', href: '/admin/bookings/services', cta: 'Add' }, { done: data.setup.hours, label: 'Set opening hours', href: '/admin/bookings/hours', cta: 'Set' }].map((x) => (
                  <li key={x.label} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 12, border: '1px solid #E3E9F2' }}>
                    {x.done ? <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', background: '#0B7A55', color: '#fff', display: 'grid', placeItems: 'center' }}><PathIcon d="M5 12l5 5L20 7" size={12} sw={3} /></span> : <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #A9B8CF', boxSizing: 'border-box' }} />}
                    <span style={{ flex: 1 }}>{x.label}{x.done && <span className={s.sr}> (done)</span>}</span>
                    {!x.done && x.href && <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href={x.href}>{x.cta}</Link>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {data.any && view === 'day' && (
            <div className={s.panel} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #E3E9F2', background: '#fff' }}>
                <span style={{ flex: '0 0 56px' }} />
                {staffKeys.map((id) => {
                  const p = data.staff.find((x) => x.id === id)!;
                  const off = day?.per[id]?.off;
                  return (
                    <div key={id} style={{ flex: '1 1 0', minWidth: 0, padding: '10px 8px', display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid #EEF2F8' }}>
                      <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--acc-soft)', color: 'var(--acc-t)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{p.initial}</span>
                      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        <span style={{ fontSize: 12, color: '#4B5872', whiteSpace: 'nowrap' }}>{off?.startsWith('Time off') ? 'Off today' : p.sub || `${blocksFor(date, id).length} booking${blocksFor(date, id).length === 1 ? '' : 's'}`}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', position: 'relative' }}>
                <div aria-hidden="true" style={{ flex: '0 0 56px', position: 'relative', height: gridH }}>
                  {hourMarks.map((h) => <span key={h.l} className={s.mono} style={{ position: 'absolute', right: 8, top: h.y, fontSize: 11, color: '#4B5872', transform: 'translateY(-50%)' }}>{h.l}</span>)}
                </div>
                {staffKeys.map((id) => (
                  <div key={id} role="list" aria-label={`${staffName(id)}, ${fmtLong(date)}`} style={{ flex: '1 1 0', minWidth: 0, position: 'relative', height: gridH, borderLeft: '1px solid #EEF2F8', backgroundImage: `repeating-linear-gradient(to bottom, #EEF2F8 0 1px, transparent 1px ${Math.round(30 * PX_PER_MIN)}px)` }}>
                    {shadeFor(date, id).map((z, i) => <div key={i} className={s.hatchBg} style={{ position: 'absolute', left: 0, right: 0, top: z.y, height: z.h, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6, boxSizing: 'border-box' }}><span style={{ fontSize: 12, color: '#4B5872', fontWeight: 500 }}>{z.l}</span></div>)}
                    {blocksFor(date, id).map((b) => {
                      const tag = b.status === 'noshow' ? 'No-show' : b.status === 'unconfirmed' ? (b.reminder === 'failed' ? 'Reminder failed' : 'Unconfirmed') : '';
                      return (
                        <span key={b.id}>
                          <button type="button" role="listitem" className={s.blk} aria-pressed={selId === b.id} aria-label={`${t(b.s)} to ${t(b.e)}, ${b.client}, ${b.service}, ${STATUS_LABEL[b.status]}${b.source === 'wa' ? ', booked on WhatsApp' : ', added by hand'}`} onClick={(e) => openBlock(b, e.currentTarget)} style={{ top: yy(b.s) + 2, height: Math.max(28, yy(b.e) - yy(b.s) - 4), ...blockStyle(b, past(b)) }}>
                            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                              <span className={s.mono} style={{ fontSize: 11, color: '#33405A' }}>{t(b.s)}–{t(b.e)}</span>
                              {b.source === 'wa' && <span style={{ flex: 'none', marginTop: 1, display: 'inline-flex' }}><PathIcon d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" size={13} sw={2.2} stroke="#33405A" /></span>}
                            </span>
                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(b.status === 'noshow' ? { textDecoration: 'line-through' } : {}) }}>{b.client}</span>
                            <span style={{ color: '#33405A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.service}</span>
                            {tag && <span className={s.tag} style={b.status === 'noshow' ? css('background: #fff; color: #33405A') : b.reminder === 'failed' ? css('background: #FEF3F2; color: #912018') : css('background: #FFF4E0; color: #8A5200')}>{tag}</span>}
                          </button>
                          {b.buf > 0 && <div className={s.hatchBg} aria-hidden="true" style={{ position: 'absolute', left: 4, right: 4, top: yy(b.e) - 2, height: Math.round(b.buf * PX_PER_MIN), borderRadius: '0 0 8px 8px', opacity: 0.9 }} />}
                        </span>
                      );
                    })}
                    {showNow && <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: yy(nowMin), height: 2, background: '#D92D20', zIndex: 3 }} />}
                  </div>
                ))}
                {showNow && <span className={s.mono} style={{ position: 'absolute', left: 4, top: yy(nowMin) - 8, fontSize: 10, fontWeight: 500, color: '#fff', background: '#D92D20', padding: '1px 4px', borderRadius: 4, zIndex: 4 }}>{t(nowMin)}</span>}
              </div>
            </div>
          )}

          {data.any && view === 'week' && (
            <div className={s.panel} style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 760 }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #E3E9F2' }}>
                  <span style={{ flex: '0 0 56px' }} />
                  {weekDates(date).map((d) => {
                    const n = data.bookings.filter((b) => b.date === d && (staffFilter === 'all' || b.staffId === staffFilter)).length;
                    const today = d === data.today;
                    return (
                      <button key={d} type="button" onClick={() => go({ view: 'day', date: d, id: '' })} style={{ font: 'inherit', cursor: 'pointer', flex: '1 1 0', minWidth: 0, border: 0, borderLeft: '1px solid #EEF2F8', background: today ? 'var(--acc-soft)' : '#fff', padding: '10px 8px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2, color: '#0B1220' }}>
                        <span style={{ fontSize: 12, color: '#4B5872' }}>{fmtDay(d).split(' ')[0]}</span>
                        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: today ? 'var(--acc-t)' : '#0B1220' }}>{Number(d.slice(8))}</span>
                        <span style={{ fontSize: 11, color: '#4B5872' }}>{data.days[d]?.closed ? 'Closed' : `${n} booking${n === 1 ? '' : 's'}`}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex' }}>
                  <div aria-hidden="true" style={{ flex: '0 0 56px', position: 'relative', height: gridH }}>{hourMarks.map((h) => <span key={h.l} className={s.mono} style={{ position: 'absolute', right: 8, top: h.y, fontSize: 11, color: '#4B5872', transform: 'translateY(-50%)' }}>{h.l}</span>)}</div>
                  {weekDates(date).map((d) => {
                    const cols = staffFilter === 'all' ? data.staff.map((p) => p.id) : [staffFilter];
                    return (
                      <div key={d} role="list" aria-label={fmtLong(d)} style={{ flex: '1 1 0', minWidth: 0, position: 'relative', height: gridH, borderLeft: '1px solid #EEF2F8', backgroundImage: `repeating-linear-gradient(to bottom, #EEF2F8 0 1px, transparent 1px ${Math.round(30 * PX_PER_MIN)}px)` }}>
                        {data.days[d]?.closed ? <div className={s.hatchBg} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: gridH, display: 'flex', justifyContent: 'center', paddingTop: 8, boxSizing: 'border-box' }}><span style={{ fontSize: 12, color: '#4B5872', fontWeight: 500 }}>Closed</span></div> : null}
                        {cols.flatMap((sid, ci) => blocksFor(d, sid).map((b) => (
                          <button key={b.id} type="button" role="listitem" className={s.blk} aria-label={`${t(b.s)}, ${b.client}, with ${staffName(b.staffId)}`} onClick={(e) => openBlock(b, e.currentTarget)} style={{ top: yy(b.s) + 1, height: Math.max(22, yy(b.e) - yy(b.s) - 2), left: `calc(${(100 / cols.length) * ci}% + 2px)`, right: 'auto', width: `calc(${100 / cols.length}% - 4px)`, padding: '4px 5px', ...blockStyle(b, false) }}>
                            <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.client.split(' ')[0]}</span>
                            <span className={s.mono} style={{ fontSize: 10, color: '#33405A' }}>{staffName(b.staffId)[0]} · {t(b.s)}</span>
                          </button>
                        )))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {data.any && view === 'list' && (
            <div className={s.panel} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEF2F8', display: 'flex', flexWrap: 'wrap', gap: '8px 18px', fontSize: 14, color: '#4B5872' }}>
                <span><strong style={{ color: '#0B1220' }}>{listBk.length}</strong> bookings</span>
                <span><strong style={{ color: '#0B1220' }}>{listBk.filter((b) => b.source === 'wa').length}</strong> from WhatsApp</span>
                <span><strong style={{ color: '#0B1220' }}>{listBk.filter((b) => b.status === 'unconfirmed').length}</strong> unconfirmed</span>
              </div>
              <ol className={s.list}>
                {listBk.map((b) => (
                  <li key={b.id} className={`${s.row} ${s.listRow}`}>
                    <span className={s.mono} style={{ flex: '0 0 98px', fontSize: 13 }}>{t(b.s)}–{t(b.e)}</span>
                    <button type="button" onClick={(e) => openBlock(b, e.currentTarget)} className={s.nameBtn} style={{ flex: '1 1 220px' }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{b.client}</span>
                      <span style={{ fontSize: 13, color: '#4B5872' }}>{b.service} · with {staffName(b.staffId)} · {b.source === 'wa' ? 'WhatsApp' : 'added by hand'}</span>
                    </button>
                    <span className={s.pill} style={css(PILL[b.status])}>{STATUS_LABEL[b.status]}</span>
                  </li>
                ))}
                {!listBk.length && <li className={s.listRow} style={{ fontSize: 14, color: '#4B5872' }}>No bookings on this day.</li>}
              </ol>
            </div>
          )}
        </div>

        {panelOpen && (
          <aside className={s.calAside} role="dialog" aria-modal="false" aria-labelledby="pn-h">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEF2F8', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className={s.mono} style={{ fontSize: 11, color: '#4B5872' }}>{mode === 'new' ? 'NEW BOOKING · ADDED BY HAND' : mode === 'move' ? 'MOVE BOOKING' : sel?.source === 'wa' ? 'BOOKING · FROM WHATSAPP' : 'BOOKING · ADDED BY HAND'}</span>
                <h2 id="pn-h" style={{ margin: 0, fontSize: 20, letterSpacing: '-0.02em', fontWeight: 600 }}>{mode === 'new' ? 'New booking' : sel?.client}</h2>
              </div>
              <button type="button" className={s.ibtn} aria-label="Close panel (Esc)" onClick={closePanel}><PathIcon d="M6 6l12 12M18 6L6 18" size={18} sw={2} /></button>
            </div>

            {mode === 'view' && sel && (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}><span className={s.pill} style={css(PILL[sel.status])}>{STATUS_LABEL[sel.status]}</span><span style={{ fontSize: 13, color: '#4B5872' }}>{sel.sourceLine}</span></span>
                {noShowJust && sel.status === 'noshow' && (
                  <div role="status" className={s.slide} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F4F7FB', fontSize: 14 }}>
                    <span style={{ flex: 1 }}>Marked as a no-show. Added to {sel.client.split(' ')[0]}’s history.</span>
                    <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={undoNoShow} style={{ minHeight: 32 }}>Undo</button>
                  </div>
                )}
                <dl className={s.dl}>
                  <div className={s.dlRow}><dt>Service</dt><dd><strong>{sel.service}</strong> · {Math.round(((sel.e - sel.s) / 60) * 10) / 10} h{sel.buf ? ` + ${sel.buf} min clean-up` : ''}</dd></div>
                  <div className={s.dlRow}><dt>When</dt><dd>{fmtLong(sel.date)}, {t(sel.s)}–{t(sel.e)}</dd></div>
                  <div className={s.dlRow}><dt>With</dt><dd>{staffName(sel.staffId)}</dd></div>
                  <div className={s.dlRow}><dt>Price</dt><dd>{sel.price}, paid at the salon</dd></div>
                  <div className={s.dlRow}><dt>Reminder</dt><dd style={{ color: sel.reminder === 'failed' ? '#B42318' : '#0B1220' }}>
                    {{ confirmed: 'Sent the day before · client confirmed', sent: 'Sent · no reply yet', failed: 'Didn’t send: the number couldn’t be reached.', none: sel.source === 'wa' ? 'Goes out the day before at 18:00' : 'No reminder: added by hand' }[sel.reminder]}
                    {sel.reminder === 'failed' && <> <button type="button" className={s.linkBtn} onClick={retry}>Try again</button></>}
                  </dd></div>
                </dl>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 14, background: '#F8FAFD', border: '1px solid #EEF2F8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--acc-soft)', color: 'var(--acc-t)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{sel.client[0]}</span>
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{sel.client}</span><span className={s.mono} style={{ fontSize: 12, color: '#4B5872' }}>{sel.phone}</span></span>
                  </span>
                  <span style={{ fontSize: 13, color: '#33405A', lineHeight: 1.5 }}>{sel.history || 'No history yet'}</span>
                  {sel.note && <span style={{ fontSize: 13, lineHeight: 1.5, padding: '8px 10px', borderRadius: 8, background: '#fff', border: '1px solid #EEF2F8' }}>Note: {sel.note}</span>}
                  <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} aria-disabled="true" title="Inbox arrives in phase 2" style={{ opacity: 0.6, cursor: 'default' }}>Open chat</span>
                    <span className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} aria-disabled="true" title="Clients arrives in phase 2" style={{ opacity: 0.6, cursor: 'default' }}>Client profile</span>
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                  {sel.status === 'unconfirmed' && <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={confirmBk} disabled={saving}>{saving ? 'Saving…' : 'Mark as confirmed'}</button>}
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => startPick('move')} style={{ flex: 1 }}>Move</button>
                    {sel.status !== 'noshow' && (sel.date < data.today || (sel.date === data.today && sel.s < nowMin)) && <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={noShow} style={{ flex: 1 }}>Mark no-show</button>}
                  </span>
                  <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setCancelOpen(true)}>Cancel booking</button>
                </div>
              </div>
            )}

            {pickOpen && (
              <form onSubmit={savePick} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {mode === 'new' && (
                  <>
                    <div className={s.col}>
                      <label className={s.lbl} htmlFor="nc">Client name</label>
                      <input id="nc" className={s.field} value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value, err: '' })} placeholder="e.g. Thato Mabena" aria-invalid={Boolean(nb.err)} aria-describedby="nc-h" />
                      <span id="nc-h" className={s.hint} role={nb.err ? 'alert' : undefined} style={{ color: nb.err ? '#B42318' : '#4B5872' }}>{nb.err || 'They’ll get a WhatsApp confirmation if their number is on file.'}</span>
                    </div>
                    <div className={s.col}>
                      <label className={s.lbl} htmlFor="ns">Service</label>
                      <select id="ns" className={s.field} value={nb.serviceId} onChange={(e) => { setNb({ ...nb, serviceId: e.target.value }); setPick({ ...pick, time: -1, force: false }); }}>{data.services.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.minutes >= 60 ? `${Math.floor(x.minutes / 60)} h${x.minutes % 60 ? ` ${x.minutes % 60}` : ''}` : `${x.minutes} min`} · {x.priceRand ? `R ${x.priceRand}` : 'Free'}</option>)}</select>
                    </div>
                  </>
                )}
                {mode === 'move' && sel && <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F8FAFD', border: '1px solid #EEF2F8', fontSize: 14, lineHeight: 1.5 }}>Moving <strong>{sel.client}</strong> · {sel.service}<br /><span style={{ color: '#4B5872' }}>Now: {fmtLong(sel.date)}, {t(sel.s)}–{t(sel.e)}</span></div>}
                <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}><legend className={s.lbl} style={{ padding: 0, marginBottom: 6 }}>Day</legend>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{pickDays.map((d) => { const off = data.days[d].closed; return <button key={d} type="button" className={s.chipb} aria-pressed={pick.date === d} disabled={off} onClick={() => setPick({ ...pick, date: d, time: -1, force: false })}>{fmtDay(d).split(' ').slice(0, 2).join(' ')}</button>; })}</div>
                </fieldset>
                <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}><legend className={s.lbl} style={{ padding: 0, marginBottom: 6 }}>With</legend>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{data.staff.filter((p) => mode === 'move' || !svc || svc.staff.includes(p.id)).map((p) => <button key={p.id} type="button" className={s.chipb} aria-pressed={pick.staffId === p.id} onClick={() => setPick({ ...pick, staffId: p.id, time: -1, force: false })}>{p.name}{pickDay?.per[p.id]?.off.startsWith('Time off') ? ' (off)' : ''}</button>)}</div>
                </fieldset>
                <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}><legend className={s.lbl} style={{ padding: 0, marginBottom: 6 }}>Start time <span className={s.hint} style={{ fontWeight: 400 }}>· {Math.floor(len / 60)} h{len % 60 ? ` ${len % 60} min` : ''}</span></legend>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 6 }}>
                    {slots.map(({ m, state }) => {
                      const off = state.state === 'off';
                      const on = pick.time === m;
                      const busyS = state.state === 'busy';
                      const style: React.CSSProperties = on ? (busyS ? css('border: 2px solid #B42318; background: #FEF3F2; color: #8A1C12') : css('border: 2px solid var(--acc); background: var(--acc-soft); color: var(--acc-t)')) : off ? css('border: 1px solid #EEF2F8; background: #F4F7FB; color: #8C97AB') : busyS ? css('border: 1px dashed #D08A82; background: #fff; color: #8A1C12') : css('border: 1px solid #D5DEEB; background: #fff; color: #0B1220');
                      return <button key={m} type="button" className={s.slotb} aria-pressed={on} aria-label={`${t(m)}${off ? ', not available' : busyS ? `, busy with ${state.clash?.client}` : ', free'}`} disabled={off} onClick={() => { setPick({ ...pick, time: m, force: false }); setPickErr(''); }} style={style}>{t(m)}<span style={{ fontSize: 10, fontWeight: 500 }}>{busyS ? 'Busy' : ''}</span></button>;
                    })}
                  </div>
                  {pickErr && <span role="alert" className={s.hint} style={{ color: '#B42318', fontWeight: 500 }}>{pickErr}</span>}
                  <span className={s.hint}>Grey times are outside opening hours or too late to finish. “Busy” overlaps another booking.</span>
                </fieldset>
                {clash && (
                  <div role="alert" className={s.slide} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 12, background: '#FEF3F2', color: '#8A1C12', fontSize: 14, lineHeight: 1.5 }}>
                    <span><strong>This double-books {staffName(pick.staffId)}.</strong> {staffName(pick.staffId)} already has {clash.client} at {t(clash.s)}–{t(busy.find((x) => x.client === clash.client && x.s === clash.s)?.end ?? clash.e)}. Both clients will expect them at the same time.</span>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={pick.force} onChange={() => setPick({ ...pick, force: !pick.force })} style={{ width: 18, height: 18, accentColor: '#B42318', margin: 0 }} /> Book it anyway, I’ve checked with {staffName(pick.staffId)}</label>
                  </div>
                )}
                {mode === 'move' && sel && <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}><input type="checkbox" checked={notify} onChange={() => setNotify(!notify)} style={{ width: 18, height: 18, accentColor: 'var(--acc)', margin: 0 }} /> Send {sel.client.split(' ')[0]} a WhatsApp message about the change</label>}
                <span style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => { if (mode === 'new') closePanel(); else { setMode('view'); setPick({ ...pick, time: -1 }); } }}>Back</button>
                  <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ flex: 1 }} disabled={cantSave}>{saving ? 'Saving…' : mode === 'new' ? 'Add booking' : 'Save move'}</button>
                </span>
              </form>
            )}
          </aside>
        )}
      </div>

      {cancelOpen && sel && (
        <div className={s.scrim} onClick={() => setCancelOpen(false)}>
          <div className={s.modal} role="alertdialog" aria-modal="true" aria-labelledby="cx-h" onClick={(e) => e.stopPropagation()}>
            <h2 id="cx-h">Cancel {sel.client.split(' ')[0]}’s booking?</h2>
            <p>{sel.service}, {fmtLong(sel.date)}, {t(sel.s)}–{t(sel.e)}. The time becomes free for others to book.</p>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}><input type="checkbox" checked={notify} onChange={() => setNotify(!notify)} style={{ width: 18, height: 18, accentColor: 'var(--acc)', margin: 0 }} /> Tell {sel.client.split(' ')[0]} on WhatsApp</label>
            <span className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setCancelOpen(false)} autoFocus>Keep booking</button>
              <button type="button" className={`${s.btn} ${s.btnRed}`} onClick={doCancel}>Cancel booking</button>
            </span>
          </div>
        </div>
      )}
      {toast && (
        <div role="status" className={`${s.toast} ${s.toastRow}`}>
          <span>{toast.text}</span>
          {toast.undo && <button type="button" className={s.toastUndo} onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}
        </div>
      )}
    </div>
  );
}
