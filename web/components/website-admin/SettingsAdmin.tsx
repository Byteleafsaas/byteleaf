'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PathIcon } from '@/components/admin/icons';
import { saveSettingsAction } from '@/lib/server/actions/launch';
import type { PublishInfo } from '@/lib/server/launch/admin';
import { AREAS_MAX, AREA_MAX, NAME_MAX, logoWord, settingsProblems, type SettingsErrors } from '@/lib/launch/rules';
import { closedLine, hoursLine } from '@/lib/launch/site';
import type { Settings } from '@/lib/launch/types';
import b from '../booking-admin/booking.module.css';
import PublishBar from './PublishBar';
import w from './w.module.css';

const same = (a: unknown, c: unknown) => JSON.stringify(a) === JSON.stringify(c);
const FIELD_COUNT = (e: SettingsErrors) => Object.keys(e).length;

/** Under each field: every place on the site that shows it, so "one field changes it everywhere" is visible. */
function AppearsOn({ on }: { on: string[] }) {
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span className={b.hint}>Appears on</span>
      {on.map((x) => <span key={x} className={w.statePill} style={{ background: '#F4F7FB', color: '#33405A' }}>{x}</span>)}
    </span>
  );
}

export default function SettingsAdmin({ settings, live, publish }: { settings: Settings; live: Settings; publish: PublishInfo }) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [base, setBase] = useState(settings);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [area, setArea] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setS(settings); setBase(settings); }, [settings]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const dirty = !same(s, base);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setS((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const addArea = () => {
    const v = area.trim();
    if (!v) return;
    if (v.length > AREA_MAX) { setErrors((e) => ({ ...e, areas: `Each area is 1 to ${AREA_MAX} characters.` })); return; }
    if (s.areas.length >= AREAS_MAX) { setErrors((e) => ({ ...e, areas: `Up to ${AREAS_MAX} areas.` })); return; }
    if (!s.areas.some((a) => a.toLowerCase() === v.toLowerCase())) set('areas', [...s.areas, v]);
    setArea('');
  };
  const onAreaKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addArea(); } };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const er = settingsProblems(s);
    if (FIELD_COUNT(er)) { setErrors(er); return; }
    setSaving(true);
    const r = await saveSettingsAction(s);
    setSaving(false);
    if (!r.ok) { setErrors((r.errors ?? {}) as SettingsErrors); return; }
    setBase(s);
    clearTimeout(timer.current); setToast('Saved as a draft. Publish to show it on your site.'); timer.current = setTimeout(() => setToast(''), 4000);
    router.refresh();
  };

  const errCount = FIELD_COUNT(errors);
  const changedName = s.name !== live.name;
  const field = (id: string, label: string, key: keyof SettingsErrors, value: string, on: (v: string) => void, opts: { type?: string; placeholder?: string; hint?: string; appears: string[]; max?: number }) => (
    <div className={b.col}>
      <label className={b.lbl} htmlFor={id}>{label}</label>
      <input id={id} className={b.field} type={opts.type ?? 'text'} value={value} maxLength={opts.max} placeholder={opts.placeholder} onChange={(e) => on(e.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={`${id}-h`} />
      <span id={`${id}-h`} className={b.hint} role={errors[key] ? 'alert' : undefined} style={{ color: errors[key] ? '#B42318' : '#4B5872' }}>{errors[key] ?? opts.hint ?? ''}</span>
      <AppearsOn on={opts.appears} />
    </div>
  );

  return (
    <div className={w.wrapPad}>
      <div className={b.page}>
        <header className={b.header}>
          <div className={b.titleBox}><span className={b.crumb}>{live.name} / Website</span><h1 className={b.h1}>Site settings</h1></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {dirty && <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#8A5200' }}><span className={w.dot} aria-hidden="true" />Unsaved changes</span>}
            <button type="submit" form="settings-form" className={`${b.btn} ${b.btnPrimary}`} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </header>
        <div className={b.pad} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 20 }}>
          <form id="settings-form" onSubmit={save} noValidate style={{ flex: '999 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errCount > 0 && <div role="alert" className={b.errBar}><strong>{errCount} {errCount === 1 ? 'thing' : 'things'} to fix</strong> before this can be saved. They are marked below.</div>}
            <section className={b.panel} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="g1">
              <h2 id="g1" className={b.h2}>Your business</h2>
              <div className={b.col}>
                <span className={b.between}><label className={b.lbl} htmlFor="nm">Business name</label><span className={b.cnt} style={{ color: s.name.length > NAME_MAX ? '#B42318' : '#4B5872' }}>{s.name.length} / {NAME_MAX}</span></span>
                <input id="nm" className={b.field} value={s.name} onChange={(e) => set('name', e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby="nm-h" />
                <span id="nm-h" className={b.hint} role={errors.name ? 'alert' : undefined} style={{ color: errors.name ? '#B42318' : '#4B5872' }}>{errors.name ?? (changedName ? `Your logo will read “${logoWord(s.name)}.” once you publish.` : 'The logo uses the first word of this name.')}</span>
                <AppearsOn on={['Logo', 'Footer', 'Browser tab', 'Emails']} />
              </div>
              {field('ds', 'Short description', 'name', s.description, (v) => set('description', v), { max: 160, hint: 'One line about what you do. Used when your site is shared.', appears: ['Search results', 'Sharing'] })}
            </section>
            <section className={b.panel} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="g2">
              <h2 id="g2" className={b.h2}>How customers reach you</h2>
              {field('ph', 'Phone number', 'phone', s.phone, (v) => set('phone', v), { type: 'tel', hint: 'South African number, like 082 123 4567.', appears: ['Call button', 'Contact page', 'Footer', 'Phone call bar'] })}
              <label className={b.chk} style={{ marginTop: -8 }}><input type="checkbox" checked={s.whatsappSame} onChange={(e) => set('whatsappSame', e.target.checked)} /> WhatsApp is the same number</label>
              {!s.whatsappSame && field('wa', 'WhatsApp number', 'whatsapp', s.whatsapp, (v) => set('whatsapp', v), { type: 'tel', appears: ['WhatsApp buttons'] })}
              {field('em', 'Email for enquiries', 'email', s.email, (v) => set('email', v), { type: 'email', hint: 'New booking requests are sent here.', appears: ['Enquiry emails', 'Footer'] })}
              <div className={b.col}>
                <label className={b.lbl} htmlFor="ar">Areas you serve</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {s.areas.map((a) => <span key={a} className={w.chip}>{a}<button type="button" aria-label={`Remove ${a}`} onClick={() => set('areas', s.areas.filter((x) => x !== a))}><PathIcon d="M6 6l12 12M18 6L6 18" size={12} sw={2.4} /></button></span>)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input id="ar" className={b.field} value={area} maxLength={AREA_MAX + 5} placeholder="Add an area and press Enter" onChange={(e) => setArea(e.target.value)} onKeyDown={onAreaKey} aria-describedby="ar-h" />
                  <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={addArea}>Add</button>
                </div>
                <span id="ar-h" className={b.hint} role={errors.areas ? 'alert' : undefined} style={{ color: errors.areas ? '#B42318' : '#4B5872' }}>{errors.areas ?? `Up to ${AREAS_MAX}. ${s.areas.length} added.`}</span>
                <AppearsOn on={['Home page', 'Contact page', 'Booking form']} />
              </div>
            </section>
            <section className={b.panel} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="g3">
              <h2 id="g3" className={b.h2}>Opening hours</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {(['weekdays', 'saturday', 'sunday'] as const).map((k) => (
                  <div key={k} className={b.col} style={{ flex: '1 1 160px' }}>
                    <label className={b.lbl} htmlFor={`h-${k}`}>{k === 'weekdays' ? 'Monday to Friday' : k === 'saturday' ? 'Saturday' : 'Sunday'}</label>
                    <input id={`h-${k}`} className={b.field} value={s.hours[k]} onChange={(e) => set('hours', { ...s.hours, [k]: e.target.value })} placeholder="07:00–17:00 or Closed" />
                  </div>
                ))}
              </div>
              <AppearsOn on={['Home page', 'Contact page', 'Footer']} />
            </section>
            <section className={b.panel} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="g4">
              <h2 id="g4" className={b.h2}>Social links <span className={b.hint} style={{ fontWeight: 400 }}>· optional</span></h2>
              {field('ig', 'Instagram', 'instagram', s.instagram, (v) => set('instagram', v), { placeholder: 'https://instagram.com/yourname', appears: ['Footer'] })}
              {field('fb', 'Facebook', 'facebook', s.facebook, (v) => set('facebook', v), { placeholder: 'https://facebook.com/yourpage', appears: ['Footer'] })}
            </section>
            <section className={b.panel} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }} aria-labelledby="g5">
              <h2 id="g5" className={b.h2}>Web address</h2>
              <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}><span className={b.mono} style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>[yourdomain.co.za]</span><span className={`${w.statePill} ${w.pillLive}`}>CONNECTED · SECURE</span></span>
              <span className={b.hint}>byteleaf looks after your domain and its security certificate. To change the address, contact us.</span>
            </section>
          </form>

          <aside style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 16 }} aria-label="How it looks">
            <span className={b.mono} style={{ fontSize: 11, color: '#4B5872' }}>HOW IT LOOKS ON YOUR SITE</span>
            <div style={{ borderRadius: 16, background: '#10261B', color: '#FAF6EC', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 28, lineHeight: 1 }}>{logoWord(s.name)}<span style={{ color: '#F5B700' }}>.</span></span>
              <span style={{ display: 'flex', gap: 8 }}><span style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 10, border: '2px solid #FAF6EC', fontWeight: 600, fontSize: 14 }}>Call</span><span style={{ flex: 2, textAlign: 'center', padding: '8px 0', borderRadius: 10, background: '#F5B700', color: '#10261B', fontWeight: 600, fontSize: 14 }}>WhatsApp us</span></span>
              <span style={{ fontSize: 14 }}>{hoursLine(s.hours)}<br /><span style={{ color: '#B7C9BD' }}>{closedLine(s.hours)}</span></span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{s.areas.map((a) => <span key={a} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(250,246,236,.14)' }}>{a}</span>)}</span>
            </div>
          </aside>
        </div>
      </div>
      {toast && <div role="status" className={b.toast}>{toast}</div>}
      <PublishBar publish={publish} previewHref="/admin/website/preview/contact" />
    </div>
  );
}
