'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PathIcon } from '@/components/admin/icons';
import { useBookingInfo } from '@/lib/admin/booking-info';
import { saveHoursAction } from '@/lib/server/actions/whatsapp-admin';
import type { HoursData } from '@/lib/server/whatsapp/admin';
import { DAY_NAMES, previewSlots, timeText, weekProblem, type Week } from '@/lib/whatsapp/hours';
import s from './booking.module.css';

type Staff = HoursData['staff'][number];
type Model = { salon: Week; staff: Staff[]; open: string[]; reminderHour: number };

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const fromData = (d: HoursData): Model => ({ salon: clone(d.salon), staff: clone(d.staff), open: d.holidays.filter((h) => h.open).map((h) => h.date), reminderHour: d.reminderHour });
const opts = (from: number, to: number, sel: number) => { const o: { v: number; l: string }[] = []; for (let m = from; m <= to; m += 30) o.push({ v: m, l: timeText(m) }); if (!o.some((x) => x.v === sel)) o.push({ v: sel, l: timeText(sel) }); return o.sort((a, b) => a.v - b.v); };
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtHol = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });

function Switch({ on, label, labelledBy, disabled, onClick }: { on: boolean; label?: string; labelledBy?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={s.sw} role="switch" aria-checked={on} aria-label={label} aria-labelledby={labelledBy} disabled={disabled} onClick={onClick} style={{ background: on ? 'var(--acc)' : '#C9D3E3', ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}>
      <span className={s.knob} style={{ left: on ? 21 : 3 }} />
    </button>
  );
}

export default function HoursView({ data, initialTab = 'salon' }: { data: HoursData; initialTab?: string }) {
  const router = useRouter();
  const biz = useBookingInfo();
  const base = useRef(JSON.stringify(fromData(data)));
  const [m, setM] = useState<Model>(() => fromData(data));
  const [tab, setTab] = useState(data.staff.some((p) => p.id === initialTab) ? initialTab : 'salon');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [offOpen, setOffOpen] = useState(false);
  const [off, setOff] = useState({ a: '', b: '', n: '' });
  const [offErr, setOffErr] = useState('');
  const [pvSvc, setPvSvc] = useState(data.services[0]?.id ?? '');
  const [pvDay, setPvDay] = useState(0);

  const dirty = JSON.stringify(m) !== base.current;
  const staff = tab === 'salon' ? null : m.staff.find((p) => p.id === tab) ?? null;
  const weekOf = (p: Staff | null): Week => (!p ? m.salon : p.same ? m.salon : p.week);
  const wk = weekOf(staff);
  const locked = Boolean(staff?.same);
  const anyBad = [m.salon, ...m.staff.filter((p) => !p.same).map((p) => p.week)].some((w) => weekProblem(w));

  // Leaving with unsaved hours would lose them.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const edit = (fn: (n: Model) => void) => { const n = clone(m); fn(n); setM(n); setSaved(false); setError(''); };
  const target = (n: Model): Week => (tab === 'salon' ? n.salon : n.staff.find((p) => p.id === tab)!.week);

  const save = async () => {
    setSaving(true);
    const r = await saveHoursAction({ salon: m.salon, staff: m.staff.map((p) => ({ id: p.id, same: p.same, week: p.week, offs: p.offs.map((o) => ({ a: o.a, b: o.b, n: o.n })) })), holidayOpen: m.open, reminderHour: m.reminderHour });
    setSaving(false);
    if (!r.ok) { setError(r.error); return; }
    base.current = JSON.stringify(m);
    setSaved(true);
    router.refresh();
  };
  const discard = () => { setM(JSON.parse(base.current)); setSaved(false); setError(''); };

  const addOff = (e: FormEvent) => {
    e.preventDefault();
    if (!off.a) { setOffErr('Choose the first day off.'); return; }
    const b = off.b || off.a;
    if (b < off.a) { setOffErr('The last day can’t be before the first.'); return; }
    edit((n) => { n.staff.find((p) => p.id === tab)!.offs.push({ a: off.a, b, n: off.n, clash: 0 }); });
    setOffOpen(false);
  };

  // Live preview: the same rule WhatsApp uses, run on what is on screen right now.
  const svc = data.services.find((x) => x.id === pvSvc) ?? data.services[0];
  const day = data.days[pvDay];
  const who = (staff ? [staff] : m.staff).filter((p) => svc?.staff.includes(p.id));
  const slots = svc && day ? previewSlots({ people: who.map((p) => ({ week: weekOf(p), busy: data.busy[p.id]?.[day.date] ?? [] })), weekdayIndex: day.weekdayIndex, minutes: svc.minutes, bufferMin: svc.bufferMin }) : [];
  const free = slots.filter((x) => x.free);
  const cantDo = Boolean(staff && svc && !svc.staff.includes(staff.id));
  const salonClosed = day ? !m.salon[day.weekdayIndex].open : false;
  const none = !free.length;
  const noneText = cantDo ? `${staff!.name} doesn’t do this service. Change it in Services.` : salonClosed ? 'The salon is closed that day, so WhatsApp skips it in the list of days.' : 'Nothing fits that day. WhatsApp skips it and offers the next day with space.';

  const tabs = [{ key: 'salon', label: 'Salon hours', ini: '' }, ...m.staff.map((p) => ({ key: p.id, label: p.name, ini: p.initial }))];

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.titleBox}><span className={s.crumb}>{biz.name} / Booking</span><h1 className={s.h1}>Staff &amp; hours</h1></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {dirty && (
            <>
              <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#8A5200' }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#B45309' }} />Unsaved changes</span>
              <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={discard}>Discard</button>
            </>
          )}
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={save} disabled={!dirty || anyBad || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </header>

      <div className={s.hoursWrap}>
        <div role="tablist" aria-label="Whose hours" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" className={s.htab} aria-selected={tab === t.key} onClick={() => { setTab(t.key); setOffOpen(false); setOffErr(''); }}>
              {t.ini && <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--acc-soft)', color: 'var(--acc-t)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{t.ini}</span>}
              {t.label}
            </button>
          ))}
        </div>

        {saved && <div role="status" className={`${s.savedBar} ${s.slide}`}><strong>Saved.</strong> WhatsApp offers the new times from now on. Existing bookings didn’t move.</div>}
        {error && <div role="alert" className={s.errBar}>{error}</div>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section className={s.panel} aria-labelledby="wk-h" style={{ overflow: 'hidden' }}>
              <div className={s.sectionHead}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <h2 id="wk-h" className={s.h2}>{staff ? `${staff.name}’s working week` : 'Salon opening hours'}</h2>
                  <span className={s.hint}>{staff ? (staff.same ? 'Works whenever the salon is open.' : 'Must fall inside salon hours.') : 'Nobody can be booked outside these hours.'}</span>
                </div>
                {staff && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                    <span id="same-l">Same as salon hours</span>
                    <Switch on={staff.same} labelledBy="same-l" onClick={() => edit((n) => { const p = n.staff.find((x) => x.id === tab)!; p.same = !p.same; if (!p.same) p.week = clone(n.salon); })} />
                  </span>
                )}
              </div>
              {wk.map((d, i) => {
                const bizClosed = Boolean(staff) && !m.salon[i].open;
                const bad = d.open && d.b <= d.a;
                const lockedDay = locked || bizClosed;
                const shown = d.open && !bizClosed;
                return (
                  <div key={i} className={`${s.drow} ${bad ? s.drowBad : ''}`}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{DAY_NAMES[i]}</span>
                    <Switch on={shown} label={`${DAY_NAMES[i]} open`} disabled={lockedDay} onClick={() => edit((n) => { const x = target(n)[i]; x.open = !x.open; })} />
                    <div className="times" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 10px', minWidth: 0 }}>
                      {shown ? (
                        <>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select className={s.tsel} aria-label={`${DAY_NAMES[i]} opens`} value={d.a} disabled={lockedDay} onChange={(e) => edit((n) => { target(n)[i].a = +e.target.value; })}>{opts(360, 1200, d.a).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                            <span aria-hidden="true" style={{ color: '#4B5872' }}>to</span>
                            <select className={s.tsel} aria-label={`${DAY_NAMES[i]} closes`} aria-invalid={bad} value={d.b} disabled={lockedDay} onChange={(e) => edit((n) => { target(n)[i].b = +e.target.value; })}>{opts(390, 1260, d.b).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                          </span>
                          {d.br && (
                            <span className={s.breakChip}>Break {timeText(d.br[0])}–{timeText(d.br[1])}
                              <button type="button" className={s.ibtn} aria-label={`Remove break on ${DAY_NAMES[i]}`} disabled={lockedDay} onClick={() => edit((n) => { target(n)[i].br = null; })} style={{ width: 28, height: 28 }}><PathIcon d="M6 6l12 12M18 6L6 18" size={14} sw={2.4} /></button>
                            </span>
                          )}
                          {!d.br && !lockedDay && <button type="button" className={s.lnk} onClick={() => edit((n) => { const x = target(n)[i]; const mid = Math.round((x.a + x.b) / 120) * 60; x.br = [mid, mid + 30]; })}>+ Add a break</button>}
                          {bad && <span role="alert" style={{ flexBasis: '100%', fontSize: 13, color: '#B42318' }}>Closing time must be after opening time.</span>}
                        </>
                      ) : (
                        <span style={{ fontSize: 14, color: '#4B5872' }}>{bizClosed ? 'Salon closed' : staff ? 'Not working' : 'Closed'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>

            {staff && (
              <section className={s.panel} aria-labelledby="to-h" style={{ overflow: 'hidden' }}>
                <div className={s.sectionHead}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><h2 id="to-h" className={s.h2}>Time off</h2><span className={s.hint}>Clients aren’t offered times on these days.</span></div>
                  <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => { setOffOpen(!offOpen); setOff({ a: '', b: '', n: '' }); setOffErr(''); }} aria-expanded={offOpen}>Add time off</button>
                </div>
                {offOpen && (
                  <form className={`${s.slide} ${s.offForm}`} onSubmit={addOff}>
                    <span className={s.col} style={{ flex: '1 1 140px' }}><label className={s.lbl} htmlFor="o1">From</label><input id="o1" className={s.field} type="date" value={off.a} min={data.today} onChange={(e) => { setOff({ ...off, a: e.target.value }); setOffErr(''); }} /></span>
                    <span className={s.col} style={{ flex: '1 1 140px' }}><label className={s.lbl} htmlFor="o2">To</label><input id="o2" className={s.field} type="date" value={off.b} min={data.today} aria-invalid={Boolean(offErr)} aria-describedby="o2-h" onChange={(e) => { setOff({ ...off, b: e.target.value }); setOffErr(''); }} /></span>
                    <span className={s.col} style={{ flex: '2 1 200px' }}><label className={s.lbl} htmlFor="o3">Note <span className={s.hint} style={{ fontWeight: 400 }}>· only you see this</span></label><input id="o3" className={s.field} value={off.n} placeholder="e.g. Leave" onChange={(e) => setOff({ ...off, n: e.target.value })} /></span>
                    <button type="submit" className={`${s.btn} ${s.btnPrimary}`}>Add</button>
                    <span id="o2-h" role={offErr ? 'alert' : undefined} style={{ flexBasis: '100%', fontSize: 13, color: '#B42318' }}>{offErr}</span>
                  </form>
                )}
                <ul className={s.plainList}>
                  {staff.offs.map((o, i) => (
                    <li key={`${o.a}-${i}`} className={s.liRow}>
                      <span aria-hidden="true" className={s.hatch} />
                      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{o.a === o.b ? fmtDate(o.a) : `${fmtDate(o.a)} – ${fmtDate(o.b)}`}</span>
                        <span className={s.hint}>{o.n || 'No note'}</span>
                      </span>
                      {o.clash > 0 && <span className={s.pill} style={{ background: '#FFF4E0', color: '#8A5200' }}>{o.clash} {o.clash === 1 ? 'booking' : 'bookings'} need a new time</span>}
                      <button type="button" className={s.ibtn} aria-label={`Remove time off ${fmtDate(o.a)}`} onClick={() => edit((n) => { n.staff.find((p) => p.id === tab)!.offs.splice(i, 1); })}><PathIcon d="M6 6l12 12M18 6L6 18" size={16} sw={2} /></button>
                    </li>
                  ))}
                  {!staff.offs.length && <li className={s.liRow} style={{ fontSize: 14, color: '#4B5872' }}>No time off planned.</li>}
                </ul>
              </section>
            )}

            {!staff && (
              <section className={s.panel} aria-labelledby="rm-h" style={{ overflow: 'hidden' }}>
                <div className={s.sectionHead}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><h2 id="rm-h" className={s.h2}>Reminders</h2><span className={s.hint}>Each booking gets one reminder on WhatsApp, the evening before. A booking made after this time gets none.</span></div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><label htmlFor="rh" style={{ fontSize: 14 }}>Send at</label><select id="rh" className={s.tsel} value={m.reminderHour} onChange={(e) => edit((n) => { n.reminderHour = +e.target.value; })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}</select></span>
                </div>
              </section>
            )}

            {!staff && (
              <section className={s.panel} aria-labelledby="ph-h" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 2 }}><h2 id="ph-h" className={s.h2}>Public holidays</h2><span className={s.hint}>South African public holidays coming up. Closed unless you open.</span></div>
                <ul className={s.plainList}>
                  {data.holidays.map((h) => {
                    const on = m.open.includes(h.date);
                    return (
                      <li key={h.date} className={s.holRow}>
                        <span className={s.mono} style={{ flex: '0 0 96px', fontSize: 13 }}>{fmtHol(h.date)}</span>
                        <span style={{ flex: '1 1 180px', fontSize: 14, fontWeight: 500 }}>{h.name}</span>
                        <span style={{ fontSize: 13, color: '#4B5872' }}>{on ? 'Open, normal hours' : 'Closed'}</span>
                        <Switch on={on} label={`Open on ${h.name}`} onClick={() => edit((n) => { n.open = on ? n.open.filter((d) => d !== h.date) : [...n.open, h.date]; })} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          <aside className={`${s.panel} ${s.preview}`} aria-labelledby="pv-h">
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #EEF2F8', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className={s.mono} style={{ fontSize: 11, color: '#4B5872' }}>LIVE PREVIEW · UPDATES AS YOU EDIT</span>
              <h2 id="pv-h" className={s.h2}>Times clients will be offered</h2>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={s.col}>
                <label className={s.lbl} htmlFor="pvs">Service</label>
                <select id="pvs" className={s.field} value={pvSvc} onChange={(e) => setPvSvc(e.target.value)}>{data.services.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.minutes >= 60 ? `${Math.floor(o.minutes / 60)} h${o.minutes % 60 ? ` ${o.minutes % 60}` : ''}` : `${o.minutes} min`}</option>)}</select>
              </div>
              <div role="group" aria-label="Day" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {data.days.map((d, i) => <button key={d.date} type="button" className={s.dchip} aria-pressed={pvDay === i} onClick={() => setPvDay(i)}><span>{d.dow}</span><strong style={{ fontSize: 15 }}>{d.n}</strong></button>)}
              </div>
              <span style={{ fontSize: 14, color: '#33405A' }}><strong style={{ color: '#0B1220' }}>{free.length}</strong> {free.length === 1 ? 'start time' : 'start times'}{staff ? ` with ${staff.name}` : ' with anyone who does this service'}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} aria-live="polite">
                {slots.map((x) => (
                  <span key={x.start} className={s.slotc} style={x.free ? { background: 'var(--acc-soft)', color: 'var(--acc-t)' } : { background: '#F4F7FB', color: '#6B7891', textDecoration: 'line-through' }}>{timeText(x.start)}<span className={s.sr}>{x.free ? ', open' : ', booked'}</span></span>
                ))}
              </div>
              {none && <p style={{ margin: 0, padding: '12px 14px', borderRadius: 10, background: '#F4F7FB', fontSize: 14, lineHeight: 1.5, color: '#33405A' }}>{noneText}</p>}
              <span className={s.hint} style={{ lineHeight: 1.5 }}>Starts every 30 minutes. A start is offered only if the whole service and clean-up fit before closing or a break. Crossed-out times are already booked. WhatsApp shows up to 9 at a time.</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
