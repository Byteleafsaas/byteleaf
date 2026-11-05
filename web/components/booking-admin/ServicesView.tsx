'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { addSalonTemplateAction, deleteServiceAction, reorderServicesAction, saveServiceAction, toggleServiceAction } from '@/lib/server/actions/whatsapp-admin';
import { fmtLength, fmtMoney } from '@/lib/whatsapp/copy';
import { PathIcon } from '@/components/admin/icons';
import type { ServiceRow, StaffRow } from '@/lib/server/whatsapp/admin';
import { useBookingInfo } from '@/lib/admin/booking-info';
import s from './booking.module.css';

type Form = { id: string; name: string; minutes: number; price: string; bufferMin: number; staff: string[]; onWhatsApp: boolean; line: string; hideName: boolean; upcoming: number };
type Errors = Partial<Record<'name' | 'price' | 'staff', string>>;
type Dialog = '' | 'discard' | 'delete';

const LIMIT = 9;
const priceTxt = (rand: number) => (rand ? fmtMoney(rand * 100) : 'Free');
const autoTxt = (minutes: number, price: string) => `${fmtLength(minutes)} · ${priceTxt(+price || 0)}`;
const counterColor = (n: number, max: number) => (n > max ? '#B42318' : n * 1.3 > max ? '#8A5200' : '#4B5872');

const toForm = (r: ServiceRow): Form => ({ id: r.id, name: r.name, minutes: r.minutes, price: String(r.priceRand), bufferMin: r.bufferMin, staff: r.staff, onWhatsApp: r.onWhatsApp, line: r.line, hideName: r.hideName, upcoming: r.upcoming });

function Switch({ on, label, labelledBy, onClick }: { on: boolean; label?: string; labelledBy?: string; onClick: () => void }) {
  return (
    <button type="button" className={s.sw} role="switch" aria-checked={on} aria-label={label} aria-labelledby={labelledBy} onClick={onClick} style={{ background: on ? 'var(--acc)' : '#C9D3E3' }}>
      <span className={s.knob} style={{ left: on ? 21 : 3 }} />
    </button>
  );
}

export default function ServicesView({ initial, staff }: { initial: ServiceRow[]; staff: StaffRow[] }) {
  const router = useRouter();
  const biz = useBookingInfo();
  const [list, setList] = useState(initial);
  const [form, setForm] = useState<Form | null>(null);
  const [orig, setOrig] = useState('');
  const [err, setErr] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [dlg, setDlg] = useState<Dialog>('');
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const opener = useRef<HTMLElement | null>(null);

  // A change made elsewhere (or after a refresh) replaces what we show.
  useEffect(() => setList(initial), [initial]);
  const flash = useCallback((text: string) => { clearTimeout(timer.current); setToast(text); timer.current = setTimeout(() => setToast(''), 3500); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const dirty = form !== null && JSON.stringify(form) !== orig;
  const shown = list.filter((r) => r.onWhatsApp).length;
  const open = (f: Form) => { opener.current = document.activeElement as HTMLElement | null; setForm(f); setOrig(JSON.stringify(f)); setErr({}); };
  const close = () => { setForm(null); setErr({}); opener.current?.focus?.(); };
  const tryClose = useCallback(() => { if (dirty) setDlg('discard'); else close(); }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (dlg) setDlg('');
      else if (form) tryClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dlg, form, tryClose]);

  const set = (patch: Partial<Form>) => { setForm((f) => (f ? { ...f, ...patch } : f)); setErr({}); };

  const move = async (i: number, dir: -1 | 1) => {
    const a = list.slice();
    [a[i], a[i + dir]] = [a[i + dir], a[i]];
    setList(a);
    const r = await reorderServicesAction(a.map((x) => x.id));
    if (!r.ok) { flash(r.error); setList(list); }
  };

  const toggle = async (r: ServiceRow) => {
    if (!r.onWhatsApp && shown >= LIMIT) { flash('The WhatsApp list is full. Switch another service off first.'); return; }
    setList(list.map((x) => (x.id === r.id ? { ...x, onWhatsApp: !x.onWhatsApp } : x)));
    const res = await toggleServiceAction(r.id, !r.onWhatsApp);
    if (!res.ok) { flash(res.error); setList(list); }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const er: Errors = {};
    if (!form.name.trim()) er.name = 'Give the service a name.';
    else if (form.name.length > 24) er.name = 'Use 24 characters or fewer so it fits in WhatsApp.';
    else if (form.minutes < 15) er.name = 'A service needs to be at least 15 minutes.';
    if (form.price === '') er.price = 'Enter a price, or 0 if it’s free.';
    if (!form.staff.length) er.staff = 'Pick at least one person.';
    if (Object.keys(er).length) { setErr(er); return; }
    setSaving(true);
    const isNew = form.id === 'new';
    const res = await saveServiceAction({ id: isNew ? undefined : form.id, name: form.name, minutes: form.minutes, priceRand: +form.price, bufferMin: form.bufferMin, staff: form.staff, onWhatsApp: form.onWhatsApp, line: form.line, hideName: form.hideName });
    setSaving(false);
    if (!res.ok) { setErr({ name: res.error }); return; }
    setForm(null);
    flash(isNew ? `${form.name} added.` : 'Saved. WhatsApp shows the change straight away.');
    router.refresh();
  };

  const askDelete = () => setDlg('delete');
  const confirm = async () => {
    if (dlg === 'delete' && form) {
      const name = form.name;
      const res = await deleteServiceAction(form.id);
      setDlg('');
      setForm(null);
      flash(res.ok ? `${name} deleted.` : res.error);
      router.refresh();
    } else { setDlg(''); close(); }
  };

  const addNew = () => open({ id: 'new', name: '', minutes: 60, price: '', bufferMin: 0, staff: staff[0] ? [staff[0].id] : [], onWhatsApp: shown < LIMIT, line: '', hideName: false, upcoming: 0 });
  const useTemplate = async () => { const r = await addSalonTemplateAction(); flash(r.ok ? 'Added 5 typical salon services. Check the prices.' : r.error); router.refresh(); };
  const nameOf = (id: string) => staff.find((p) => p.id === id)?.name ?? '';

  const f = form;
  const nl = f?.name.length ?? 0;
  const dl = f?.line.length ?? 0;
  const auto = f ? autoTxt(f.minutes, f.price) : '';
  const nameHint = err.name || (nl > 24 ? 'Too long for a WhatsApp list row (24 characters).' : nl * 1.3 > 24 ? 'Fits, but may be cut off when translated. Shorter is safer.' : 'Shown to clients in the WhatsApp list.');
  const hintColor = err.name || nl > 24 ? '#B42318' : nl * 1.3 > 24 ? '#8A5200' : '#4B5872';

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.titleBox}><span className={s.crumb}>{biz.name} / Booking</span><h1 className={s.h1}>Services</h1></div>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={addNew}>
          <PathIcon d="M12 5v14M5 12h14" size={16} sw={2.4} />Add service
        </button>
      </header>
      <div className={s.body}>
        <div className={s.pad}>
          {!list.length && (
            <div className={`${s.panel} ${s.rise} ${s.empty}`}>
              <span className={s.emptyIcon} aria-hidden="true"><PathIcon d="M4 6h16M4 12h16M4 18h10" size={28} sw={2} /></span>
              <h2 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>Add what clients can book</h2>
              <p style={{ margin: 0, maxWidth: 460, fontSize: 15, lineHeight: 1.55, color: '#4B5872' }}>Each service needs a name, how long it takes and a price. Clients see them as a list in WhatsApp, in the order you set here.</p>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={addNew}>Add your first service</button>
                <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={useTemplate}>Start from a salon template</button>
              </span>
              <span className={s.hint}>Templates fill in typical services. You can change everything.</span>
            </div>
          )}

          {list.length > 0 && (
            <>
              <div role="note" className={s.noteBar}>
                <span aria-hidden="true" style={{ color: 'var(--acc-t)', display: 'inline-flex' }}><PathIcon d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" size={18} sw={2} /></span>
                <span style={{ flex: '1 1 300px' }}><strong>{shown} of {LIMIT}</strong> places used in the WhatsApp service list. A list holds 10 rows and one is kept for “Ask a person”. Order here = order in WhatsApp.</span>
              </div>
              <div className={`${s.panel} ${f ? s.narrow : ''}`} style={{ overflow: 'hidden' }}>
                <div className={`${s.srow} ${s.shead}`} aria-hidden="true">
                  <span>Order</span><span>Service</span><span className={s.cLen}>Length</span><span>Price</span><span className={s.cStaff}>Who</span><span className={s.cBuf}>Clean-up</span><span style={{ textAlign: 'right' }}>On WhatsApp</span>
                </div>
                <ol className={s.list}>
                  {list.map((r, i) => (
                    <li key={r.id} className={`${s.srow} ${s.row}`} style={f?.id === r.id ? { background: 'var(--acc-soft)' } : undefined}>
                      <span style={{ display: 'flex', gap: 4 }}>
                        <button type="button" className={s.mv} aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => move(i, -1)}><PathIcon d="M18 15l-6-6-6 6" size={14} sw={2.4} /></button>
                        <button type="button" className={s.mv} aria-label={`Move ${r.name} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}><PathIcon d="M6 9l6 6 6-6" size={14} sw={2.4} /></button>
                      </span>
                      <button type="button" className={s.nameBtn} onClick={() => open(toForm(r))}>
                        <span className={s.nameTop}>{r.name}{r.hideName && <span className={s.pill} style={{ background: '#EEF2F8', color: '#33405A' }}>PRIVATE IN MESSAGES</span>}</span>
                        <span className={s.nameSub}>{r.line || r.auto}</span>
                      </button>
                      <span className={s.cLen}>{fmtLength(r.minutes)}</span>
                      <span className={s.cPrice}>{priceTxt(r.priceRand)}</span>
                      <span className={s.cStaff} aria-label={`Done by ${r.staff.map(nameOf).join(' and ')}`}>{r.staff.map((id) => <span key={id} className={s.av} aria-hidden="true">{nameOf(id)[0]}</span>)}</span>
                      <span className={s.cBuf}>{r.bufferMin ? `${r.bufferMin} min` : '—'}</span>
                      <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Switch on={r.onWhatsApp} label={`Show ${r.name} on WhatsApp`} onClick={() => toggle(r)} /></span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className={s.hint} style={{ margin: 0 }}>Services switched off are still bookable by hand from the calendar. Changes reach WhatsApp straight away; bookings already made keep their length and price.</p>
            </>
          )}
        </div>

        {f && (
          <aside className={`${s.aside} ${s.slide}`} role="dialog" aria-modal="false" aria-labelledby="ed-h">
            <div className={s.asideHead}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className={s.mono} style={{ fontSize: 11, color: '#4B5872' }}>{f.id === 'new' ? 'NEW SERVICE' : 'EDIT SERVICE'}</span>
                <h2 id="ed-h" style={{ margin: 0, fontSize: 20, letterSpacing: '-0.02em' }}>{f.id === 'new' ? f.name || 'New service' : f.name || 'Untitled'}</h2>
              </div>
              {dirty && <span role="status" style={{ fontSize: 12, color: '#8A5200', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: '#B45309' }} />Unsaved</span>}
              <button type="button" className={s.ibtn} aria-label="Close (Esc)" onClick={tryClose}><PathIcon d="M6 6l12 12M18 6L6 18" size={18} sw={2} /></button>
            </div>
            <form onSubmit={save} noValidate className={s.form}>
              <div className={s.col}>
                <span className={s.between}><label className={s.lbl} htmlFor="sn">Name</label><span className={s.cnt} style={{ color: counterColor(nl, 24) }}>{nl} / 24</span></span>
                <input id="sn" className={s.field} value={f.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={Boolean(err.name)} aria-describedby="sn-h" />
                <span id="sn-h" className={s.hint} role={err.name ? 'alert' : undefined} style={{ color: hintColor }}>{nameHint}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className={s.col} style={{ flex: '1 1 160px' }}>
                  <span className={s.lbl} id="ln-l">Length</span>
                  <span style={{ display: 'flex', gap: 6 }} role="group" aria-labelledby="ln-l">
                    <select className={s.field} aria-label="Hours" value={Math.floor(f.minutes / 60)} onChange={(e) => set({ minutes: +e.target.value * 60 + (f.minutes % 60) })}>{[0, 1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h} h</option>)}</select>
                    <select className={s.field} aria-label="Minutes" value={f.minutes % 60} onChange={(e) => set({ minutes: Math.floor(f.minutes / 60) * 60 + +e.target.value })}>{[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
                  </span>
                </div>
                <div className={s.col} style={{ flex: '1 1 120px' }}>
                  <label className={s.lbl} htmlFor="sp">Price (R)</label>
                  <input id="sp" className={s.field} inputMode="numeric" value={f.price} onChange={(e) => set({ price: e.target.value.replace(/[^0-9]/g, '') })} aria-invalid={Boolean(err.price)} aria-describedby="sp-h" />
                  <span id="sp-h" className={s.hint} role={err.price ? 'alert' : undefined} style={{ color: '#B42318' }}>{err.price ?? ''}</span>
                </div>
              </div>
              <div className={s.col}>
                <label className={s.lbl} htmlFor="sb">Clean-up time after</label>
                <select id="sb" className={s.field} value={f.bufferMin} onChange={(e) => set({ bufferMin: +e.target.value })}>{[0, 5, 10, 15, 30].map((b) => <option key={b} value={b}>{b ? `${b} minutes` : 'None'}</option>)}</select>
                <span className={s.hint}>Blocked in the calendar after each booking. Clients don’t see it.</span>
              </div>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className={s.lbl} style={{ padding: 0, marginBottom: 4 }}>Who can do it</legend>
                {staff.map((p) => (
                  <label key={p.id} className={s.chk}>
                    <input type="checkbox" checked={f.staff.includes(p.id)} onChange={() => set({ staff: f.staff.includes(p.id) ? f.staff.filter((x) => x !== p.id) : [...f.staff, p.id] })} /> {p.name}
                  </label>
                ))}
                {err.staff && <span role="alert" className={s.hint} style={{ color: '#B42318' }}>Pick at least one person.</span>}
              </fieldset>
              <div className={s.col}>
                <span className={s.between}><label className={s.lbl} htmlFor="sd">Line under the name in WhatsApp</label><span className={s.cnt} style={{ color: counterColor(dl, 72) }}>{dl} / 72</span></span>
                <input id="sd" className={s.field} value={f.line} onChange={(e) => set({ line: e.target.value })} placeholder={auto} />
                <span className={s.hint}>Leave empty to use “{auto}”.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span id="w-l" style={{ fontWeight: 500 }}>Show on WhatsApp</span><span className={s.hint}>Off = only bookable by hand.</span></span>
                <Switch on={f.onWhatsApp} labelledBy="w-l" onClick={() => set({ onWhatsApp: !f.onWhatsApp })} />
              </div>
              <label className={s.chk} style={{ alignItems: 'flex-start' }}>
                <input type="checkbox" checked={f.hideName} onChange={() => set({ hideName: !f.hideName })} style={{ marginTop: 3 }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span>Keep the service name out of messages</span><span className={s.hint}>For clinics. Reminders say “your appointment with Dr [name]” instead.</span></span>
              </label>
              <div className={s.col} style={{ gap: 8 }}>
                <span className={s.mono} style={{ fontSize: 11, color: '#4B5872' }}>HOW IT LOOKS IN THE WHATSAPP LIST</span>
                <div className={s.previewBox}>
                  <div className={s.previewRow}>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 15, overflowWrap: 'anywhere' }}>{f.hideName ? 'Appointment' : f.name || 'Service name'}</span>
                      <span style={{ fontSize: 13, color: '#4B5872', overflowWrap: 'anywhere' }}>{f.line || auto}</span>
                    </span>
                    <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #A9B8CF', boxSizing: 'border-box', flex: 'none' }} />
                  </div>
                </div>
              </div>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving…' : f.id === 'new' ? 'Add service' : 'Save changes'}</button>
                {f.id !== 'new' && <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={askDelete}>Delete</button>}
              </span>
            </form>
          </aside>
        )}
      </div>

      {dlg && f && (
        <div className={s.scrim}>
          <div className={s.modal} role="alertdialog" aria-modal="true" aria-labelledby="dl-h" aria-describedby="dl-d">
            <h2 id="dl-h">{dlg === 'delete' ? `Delete ${f.name}?` : 'Discard your changes?'}</h2>
            <p id="dl-d">{dlg === 'delete' ? (f.upcoming ? `${f.upcoming} upcoming bookings keep this service. Clients can’t book it any more.` : 'Clients can’t book it any more. This can’t be undone.') : 'You changed this service but didn’t save. Closing now loses those changes.'}</p>
            <span className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setDlg('')} autoFocus>{dlg === 'delete' ? 'Keep it' : 'Keep editing'}</button>
              <button type="button" className={`${s.btn} ${s.btnRed}`} onClick={confirm}>{dlg === 'delete' ? 'Delete service' : 'Discard changes'}</button>
            </span>
          </div>
        </div>
      )}
      {toast && <div role="status" className={s.toast}>{toast}</div>}
    </div>
  );
}
