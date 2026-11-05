'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PathIcon } from '@/components/admin/icons';
import { deleteServiceAction, reorderServicesAction, saveServiceAction, toggleServiceAction } from '@/lib/server/actions/launch';
import type { PublishInfo } from '@/lib/server/launch/admin';
import { INCLUDED_MAX, SERVICE_NAME_MAX, rands, serviceProblems, type ServiceErrors } from '@/lib/launch/rules';
import type { Service } from '@/lib/launch/types';
import b from '../booking-admin/booking.module.css';
import PublishBar from './PublishBar';
import w from './w.module.css';

type Form = { id: string; name: string; price: string; noPrice: boolean; time: string; summary: string; included: string[]; visible: boolean };
const TIMES = ['30 minutes', '45 minutes', '1 hour', '1 hour 30 minutes', '2 hours', '3 hours', '4 hours', 'Half a day'];
const SHOWN = 6;

const toForm = (s: Service): Form => ({ id: s.id, name: s.name, price: s.price === null ? '' : String(s.price), noPrice: s.price === null, time: s.time, summary: s.summary, included: s.included.length ? s.included : [''], visible: s.visible });
const same = (a: unknown, c: unknown) => JSON.stringify(a) === JSON.stringify(c);
const counter = (n: number, max: number) => (n > max ? '#B42318' : n >= max * 0.85 ? '#8A5200' : '#4B5872');

export default function ServicesAdmin({ services, live, publish }: { services: Service[]; live: Service[]; publish: PublishInfo }) {
  const router = useRouter();
  const [list, setList] = useState(services);
  const [form, setForm] = useState<Form | null>(null);
  const [orig, setOrig] = useState('');
  const [errors, setErrors] = useState<ServiceErrors & { general?: string }>({});
  const [saving, setSaving] = useState(false);
  const [dlg, setDlg] = useState<'' | 'discard' | 'delete'>('');
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => setList(services), [services]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback((t: string) => { clearTimeout(timer.current); setToast(t); timer.current = setTimeout(() => setToast(''), 4000); }, []);

  const liveBy = useMemo(() => new Map(live.map((x) => [x.id, x])), [live]);
  const unpublished = (x: Service) => !same(liveBy.get(x.id), x);
  const dirty = form !== null && JSON.stringify(form) !== orig;
  const open = (f: Form) => { opener.current = document.activeElement as HTMLElement | null; setForm(f); setOrig(JSON.stringify(f)); setErrors({}); };
  const close = () => { setForm(null); setErrors({}); opener.current?.focus?.(); };
  const tryClose = useCallback(() => { if (dirty) setDlg('discard'); else close(); }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; if (dlg) setDlg(''); else if (form) tryClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dlg, form, tryClose]);

  const set = (patch: Partial<Form>) => { setForm((f) => (f ? { ...f, ...patch } : f)); setErrors({}); };
  const onCount = list.filter((x) => x.visible).length;
  const filtered = q.trim() ? list.filter((x) => x.name.toLowerCase().includes(q.trim().toLowerCase())) : list;

  const move = async (i: number, dir: -1 | 1) => { const a = list.slice(); [a[i], a[i + dir]] = [a[i + dir], a[i]]; setList(a); const r = await reorderServicesAction(a.map((x) => x.id)); if (!r.ok) { flash(r.error); setList(list); } else router.refresh(); };
  const toggle = async (x: Service) => { setList(list.map((y) => (y.id === x.id ? { ...y, visible: !y.visible } : y))); const r = await toggleServiceAction(x.id, !x.visible); if (!r.ok) { flash(r.error); setList(list); } else router.refresh(); };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const price = form.noPrice ? null : form.price === '' ? undefined : Number(form.price);
    const included = form.included.map((x) => x.trim()).filter(Boolean);
    const er = serviceProblems({ name: form.name, price, time: form.time, included });
    if (Object.keys(er).length) { setErrors(er); return; }
    setSaving(true);
    const r = await saveServiceAction({ id: form.id === 'new' ? undefined : form.id, name: form.name, price: price ?? null, time: form.time, summary: form.summary, included, visible: form.visible });
    setSaving(false);
    if (!r.ok) { setErrors({ general: r.error }); return; }
    setForm(null);
    flash('Saved as a draft. Publish to show it on your site.');
    router.refresh();
  };
  const confirm = async () => {
    if (dlg === 'delete' && form) { const n = form.name; await deleteServiceAction(form.id); setDlg(''); setForm(null); flash(`${n} deleted. Enquiries and bookings keep their details.`); router.refresh(); }
    else { setDlg(''); close(); }
  };

  const f = form;
  const price = f ? (f.noPrice ? null : f.price === '' ? undefined : Number(f.price)) : undefined;
  return (
    <div className={w.wrapPad}>
      <div className={b.page}>
        <header className={b.header}>
          <div className={b.titleBox}><span className={b.crumb}>Tsela Mobile Wash / Website</span><h1 className={b.h1}>Services &amp; prices</h1></div>
          <button type="button" className={`${b.btn} ${b.btnPrimary}`} onClick={() => open({ id: 'new', name: '', price: '', noPrice: false, time: '1 hour', summary: '', included: [''], visible: true })}><PathIcon d="M12 5v14M5 12h14" size={16} sw={2.4} />Add service</button>
        </header>
        <div className={b.body}>
          <div className={b.pad}>
            {!list.length ? (
              <div className={`${b.panel} ${b.rise} ${b.empty}`}>
                <span className={b.emptyIcon} aria-hidden="true"><PathIcon d="M4 6h16M4 12h16M4 18h10" size={28} sw={2} /></span>
                <h2 style={{ margin: 0, fontSize: 22 }}>What do you offer?</h2>
                <p style={{ margin: 0, maxWidth: 460, color: '#4B5872' }}>Add each wash with how long it takes and what it costs. Your site shows them as cards, in the order you set here.</p>
                <button type="button" className={`${b.btn} ${b.btnPrimary}`} onClick={() => open({ id: 'new', name: '', price: '', noPrice: false, time: '1 hour', summary: '', included: [''], visible: true })}>Add your first service</button>
              </div>
            ) : (
              <>
                <div role="note" className={b.noteBar}><span style={{ flex: '1 1 300px' }}>Customers see <strong>{onCount}</strong> {onCount === 1 ? 'service' : 'services'} on the site. The Home page shows the first {SHOWN}. Changes you save here are drafts until you publish.</span></div>
                {list.length > 8 && (
                  <div className={b.col} style={{ maxWidth: 360 }}>
                    <label className={b.lbl} htmlFor="find">Find a service</label>
                    <input id="find" className={b.field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name" />
                    {q && !filtered.length && <span className={b.hint}>No service matches “{q}”.</span>}
                  </div>
                )}
                <div className={`${b.panel} ${f ? w.srvNarrow : ''}`} style={{ overflow: 'hidden' }}>
                  <div className={`${w.srvRow} ${w.srvHead}`} aria-hidden="true"><span>Order</span><span>Service</span><span className={w.cTime}>Time</span><span className={w.cPrice}>Price</span><span style={{ textAlign: 'right' }}>On the site</span></div>
                  <ol className={b.list}>
                    {filtered.map((x) => {
                      const i = list.findIndex((y) => y.id === x.id);
                      return (
                        <li key={x.id} className={`${w.srvRow} ${b.row}`} style={f?.id === x.id ? { background: 'var(--acc-soft)' } : undefined}>
                          <span style={{ display: 'flex', gap: 4 }}>
                            <button type="button" className={b.mv} aria-label={`Move ${x.name} up`} disabled={i === 0 || Boolean(q)} onClick={() => move(i, -1)}><PathIcon d="M18 15l-6-6-6 6" size={14} sw={2.4} /></button>
                            <button type="button" className={b.mv} aria-label={`Move ${x.name} down`} disabled={i === list.length - 1 || Boolean(q)} onClick={() => move(i, 1)}><PathIcon d="M6 9l6 6 6-6" size={14} sw={2.4} /></button>
                          </span>
                          <button type="button" className={b.nameBtn} onClick={() => open(toForm(x))}>
                            <span className={b.nameTop}>{x.name}{unpublished(x) && <span className={`${w.statePill} ${w.pillDraft}`}>NOT PUBLISHED</span>}</span>
                            <span className={b.nameSub}>{x.included.length ? x.included.slice(0, 2).join(' · ') : x.summary || 'No details yet'}</span>
                          </button>
                          <span className={w.cTime} style={{ fontSize: 14 }}>{x.time}</span>
                          <span className={w.cPrice} style={{ fontSize: 14, fontWeight: 500 }}>{rands(x.price)}</span>
                          <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" className={b.sw} role="switch" aria-checked={x.visible} aria-label={`Show ${x.name} on the site`} onClick={() => toggle(x)} style={{ background: x.visible ? 'var(--acc)' : '#C9D3E3' }}><span className={b.knob} style={{ left: x.visible ? 21 : 3 }} /></button>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </>
            )}
          </div>

          {f && (
            <aside className={`${b.aside} ${b.slide}`} role="dialog" aria-modal="false" aria-labelledby="sv-h">
              <div className={b.asideHead}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}><span className={b.mono} style={{ fontSize: 11, color: '#4B5872' }}>{f.id === 'new' ? 'NEW SERVICE' : 'EDIT SERVICE'}</span><h2 id="sv-h" style={{ margin: 0, fontSize: 20 }}>{f.name || (f.id === 'new' ? 'New service' : 'Untitled')}</h2></div>
                {dirty && <span role="status" style={{ fontSize: 12, color: '#8A5200', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className={w.dot} style={{ color: '#B45309' }} aria-hidden="true" />Not saved</span>}
                <button type="button" className={b.ibtn} aria-label="Close (Esc)" onClick={tryClose}><PathIcon d="M6 6l12 12M18 6L6 18" size={18} sw={2} /></button>
              </div>
              <form onSubmit={save} noValidate className={b.form}>
                {errors.general && <div role="alert" className={w.errTxt}>{errors.general}</div>}
                <div className={b.col}>
                  <span className={b.between}><label className={b.lbl} htmlFor="sn">Name</label><span className={b.cnt} style={{ color: counter(f.name.length, SERVICE_NAME_MAX) }}>{f.name.length} / {SERVICE_NAME_MAX}</span></span>
                  <input id="sn" className={b.field} value={f.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={Boolean(errors.name)} aria-describedby="sn-h" />
                  <span id="sn-h" className={b.hint} role={errors.name ? 'alert' : undefined} style={{ color: errors.name ? '#B42318' : '#4B5872' }}>{errors.name ?? 'Shown on the card and in the booking form.'}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div className={b.col} style={{ flex: '1 1 140px' }}>
                    <label className={b.lbl} htmlFor="sp">Price (R)</label>
                    <input id="sp" className={b.field} inputMode="numeric" value={f.noPrice ? '' : f.price} disabled={f.noPrice} placeholder={f.noPrice ? 'Ask for a price' : ''} onChange={(e) => set({ price: e.target.value.replace(/[^0-9]/g, '') })} aria-invalid={Boolean(errors.price)} aria-describedby="sp-h" />
                    <label className={b.chk} style={{ minHeight: 32, fontSize: 14 }}><input type="checkbox" checked={f.noPrice} onChange={(e) => set({ noPrice: e.target.checked })} /> No fixed price</label>
                    <span id="sp-h" role={errors.price ? 'alert' : undefined} className={w.errTxt}>{errors.price ?? ''}</span>
                  </div>
                  <div className={b.col} style={{ flex: '1 1 160px' }}>
                    <label className={b.lbl} htmlFor="st">How long it takes</label>
                    <select id="st" className={b.field} value={TIMES.includes(f.time) ? f.time : f.time || TIMES[0]} onChange={(e) => set({ time: e.target.value })}>{(TIMES.includes(f.time) ? TIMES : [f.time, ...TIMES]).filter(Boolean).map((t) => <option key={t}>{t}</option>)}</select>
                    {errors.time && <span role="alert" className={w.errTxt}>{errors.time}</span>}
                  </div>
                </div>
                <div className={b.col}>
                  <label className={b.lbl} htmlFor="ss">Short description <span className={b.hint} style={{ fontWeight: 400 }}>· shown on the Home card</span></label>
                  <input id="ss" className={b.field} value={f.summary} maxLength={160} onChange={(e) => set({ summary: e.target.value })} placeholder="e.g. Outside wash, wheels and windows." />
                </div>
                <fieldset style={{ border: 0, margin: 0, padding: 0 }} className={w.incList}>
                  <legend className={b.lbl} style={{ padding: 0, marginBottom: 4 }}>What’s included <span className={b.hint} style={{ fontWeight: 400 }}>· up to {INCLUDED_MAX} lines</span></legend>
                  {f.included.map((line, i) => (
                    <div key={i} className={w.incRow}>
                      <input className={b.field} aria-label={`Included line ${i + 1}`} value={line} maxLength={80} onChange={(e) => set({ included: f.included.map((x, j) => (j === i ? e.target.value : x)) })} />
                      <button type="button" className={b.ibtn} aria-label={`Remove line ${i + 1}`} onClick={() => set({ included: f.included.length > 1 ? f.included.filter((_, j) => j !== i) : [''] })}><PathIcon d="M6 6l12 12M18 6L6 18" size={16} sw={2} /></button>
                    </div>
                  ))}
                  {f.included.length < INCLUDED_MAX && <button type="button" className={b.lnk} style={{ alignSelf: 'flex-start' }} onClick={() => set({ included: [...f.included, ''] })}>+ Add a line</button>}
                </fieldset>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span id="sw-l" style={{ fontWeight: 500 }}>Show on the site</span><span className={b.hint}>Off = hidden from customers.</span></span>
                  <button type="button" className={b.sw} role="switch" aria-checked={f.visible} aria-labelledby="sw-l" onClick={() => set({ visible: !f.visible })} style={{ background: f.visible ? 'var(--acc)' : '#C9D3E3' }}><span className={b.knob} style={{ left: f.visible ? 21 : 3 }} /></button>
                </div>
                <div className={b.col} style={{ gap: 8 }}>
                  <span className={b.mono} style={{ fontSize: 11, color: '#4B5872' }}>HOW THE CARD LOOKS ON YOUR SITE</span>
                  <div className={w.cardPrev}><span className="pt" style={{ fontSize: 13, color: '#4D5A50' }}>{f.time}</span><span className="pn" style={{ fontWeight: 800, fontSize: 20, color: '#10261B' }}>{f.name || 'Service name'}</span><span style={{ fontSize: 14, color: '#4D5A50' }}>{f.summary || 'A short description.'}</span><span style={{ fontWeight: 800, fontSize: 24, color: '#10261B' }}>{rands(price === undefined ? null : price)}</span></div>
                </div>
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                  <button type="submit" className={`${b.btn} ${b.btnPrimary}`} style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving…' : f.id === 'new' ? 'Add service' : 'Save changes'}</button>
                  {f.id !== 'new' && <button type="button" className={`${b.btn} ${b.btnDanger}`} onClick={() => setDlg('delete')}>Delete</button>}
                </span>
              </form>
            </aside>
          )}
        </div>
      </div>

      {dlg && f && (
        <div className={b.scrim}>
          <div className={b.modal} role="alertdialog" aria-modal="true" aria-labelledby="dl-h" aria-describedby="dl-d">
            <h2 id="dl-h">{dlg === 'delete' ? `Delete ${f.name}?` : 'Discard your changes?'}</h2>
            <p id="dl-d">{dlg === 'delete' ? 'Customers can’t see it any more once you publish. Enquiries and bookings that mention it keep their details.' : 'You changed this service but didn’t save. Closing now loses those edits.'}</p>
            <span className={b.modalActions}>
              <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={() => setDlg('')} autoFocus>{dlg === 'delete' ? 'Keep it' : 'Keep editing'}</button>
              <button type="button" className={`${b.btn} ${b.btnRed}`} onClick={confirm}>{dlg === 'delete' ? 'Delete service' : 'Discard edits'}</button>
            </span>
          </div>
        </div>
      )}
      {toast && <div role="status" className={b.toast}>{toast}</div>}
      <PublishBar publish={publish} previewHref="/admin/website/preview/services" />
    </div>
  );
}
