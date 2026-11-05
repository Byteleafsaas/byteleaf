'use client';

import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { css } from '@/lib/law/css';
import { D, FORM } from '@/lib/law/content';

type Values = { name: string; tel: string; email: string; area: string; msg: string; day: string; tod: string; ok: boolean };
type Errors = Partial<Record<'name' | 'tel' | 'email' | 'msg' | 'ok', string>>;
const EMPTY: Values = { name: '', tel: '', email: '', area: D.areaOpts[0], msg: '', day: D.dayOpts[0], tod: '', ok: false };
const FIELD_ID = { name: 'f1', tel: 'f2', email: 'f3', msg: 'f5', ok: 'f7' } as const;
const LINK_TEXT = FORM.summaryLinks;

function check(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = FORM.errors.name;
  const digits = v.tel.replace(/[\s()-]/g, '');
  if (!v.tel.trim()) e.tel = FORM.errors.phoneMissing;
  else if (!/^(\+27|0)\d{9}$/.test(digits)) e.tel = FORM.errors.phoneWrong;
  if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = FORM.errors.email;
  if (v.msg.trim().length < 10) e.msg = FORM.errors.description;
  if (!v.ok) e.ok = FORM.errors.consent;
  return e;
}

const Cross = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={css('flex: none; margin-top: 3px')}><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5h.01" /></svg>;

/**
 * The consultation request (HANDOFF-LAW §4). It behaves like a real form, but nothing is sent or stored: no fetch, no storage.
 * `failFirst` makes the first send fail so the failed state can be shown (the reference's ?form=fails).
 */
export default function ConsultationForm({ failFirst = false }: { failFirst?: boolean }) {
  const [v, setV] = useState<Values>(EMPTY);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const tries = useRef(0);
  const summary = useRef<HTMLDivElement>(null);
  const sentCard = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const errors = tried ? check(v) : {};
  const keys = Object.keys(errors) as (keyof Errors)[];
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((x) => ({ ...x, [k]: val }));

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (sending) return;
    setTried(true);
    setFailed(false);
    if (Object.keys(check(v)).length) { setTimeout(() => summary.current?.focus(), 0); return; }
    setSending(true);
    timer.current = setTimeout(() => {
      setSending(false);
      tries.current += 1;
      if (failFirst && tries.current === 1) { setFailed(true); return; }
      setSent(true);
      setTimeout(() => { sentCard.current?.scrollIntoView({ block: 'center' }); sentCard.current?.focus(); }, 0);
    }, 1000);
  };
  const reset = () => { setV(EMPTY); setTried(false); setSent(false); setFailed(false); tries.current = 0; };

  const first = v.name.trim().split(/\s+/)[0] || 'thank you';
  const fieldErr = (id: string, text?: string) => (text ? <span id={`${id}e`} className="lf-err"><Cross />{text}</span> : null);
  const hasErr = (k: keyof Errors) => (errors[k] ? true : undefined);

  if (sent) {
    return (
      <div id="lf-sent" ref={sentCard} tabIndex={-1} className="lf-card" role="status" style={css('scroll-margin-top: 140px; padding: 36px; gap: 18px; border-radius: 18px; border: 2px solid #1F1C18')}>
        <span aria-hidden="true" style={css('width: 52px; height: 52px; border-radius: 50%; background: #1F1C18; color: #FFFFFF; display: grid; place-items: center')}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></span>
        <h2 style={css('font-size: 2rem')}>{FORM.sent.title.replace('{firstName}', first)}</h2>
        <div className="lf-note" style={css('background: #FFF4E0; color: #5C3600')}><span><strong>This is a demo. Nothing was sent.</strong> {FORM.sent.demoNote.replace('This is a demo. Nothing was sent. ', '')}</span></div>
        <p>On the real site, an attorney would reply on <strong>{v.tel}</strong> within [reply time] to book your consultation about <strong>{v.area.toLowerCase()}</strong>.</p>
        <ol className="lf-steps" style={css('margin-top: 6px')}>
          {D.after.map((s) => <Fragment key={s.n}><li><span className="lf-n" aria-hidden="true">{s.n}</span><span style={css('padding-top: 7px')}>{s.t}</span></li></Fragment>)}
        </ol>
        <button type="button" className="lf-b lf-b-line" onClick={reset} style={css('align-self: flex-start')}>{FORM.sent.again}</button>
      </div>
    );
  }

  return (
    <form className="lf-card" onSubmit={submit} noValidate aria-labelledby="fh" style={css('padding: 32px; gap: 22px; border-radius: 18px')}>
      <div style={css('display: flex; flex-direction: column; gap: 6px')}><h2 id="fh" style={css('font-size: 1.75rem')}>Request a consultation</h2><p className="lf-hint">All fields are needed unless marked optional.</p></div>
      {keys.length > 0 && (
        <div ref={summary} role="alert" tabIndex={-1} style={css('padding: 16px 18px; border-radius: 12px; background: #FCEBE5; border: 1px solid #EBC3B6; color: #6E2414; display: flex; flex-direction: column; gap: 6px')}>
          <strong>{FORM.errors.summary.replace('{n}', `${keys.length} ${keys.length === 1 ? 'thing' : 'things'}`).replace(' thing(s)', '')}</strong>
          <ul style={css('margin: 0; padding-left: 20px')}>
            {keys.map((k) => <li key={k}><a href={`#${FIELD_ID[k]}`} onClick={(e) => { e.preventDefault(); document.getElementById(FIELD_ID[k])?.focus(); }}>{LINK_TEXT[k === 'tel' ? 'phone' : k === 'msg' ? 'description' : k === 'ok' ? 'consent' : k]}</a></li>)}
          </ul>
        </div>
      )}
      {failed && <div role="alert" style={css('padding: 16px 18px; border-radius: 12px; background: #FCEBE5; border: 1px solid #EBC3B6; color: #6E2414; line-height: 1.5')}><strong>We couldn’t send your request.</strong> Your details are still here. Check your connection and try again, or call us on <a href={`tel:${D.tel}`} style={css('color: #6E2414')}>{D.telShown}</a>.</div>}

      <div style={css('display: flex; flex-wrap: wrap; gap: 18px')}>
        <div className="lf-fld" style={css('flex: 1 1 240px')}><label htmlFor="f1">Your name</label><input id="f1" className="lf-in" autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} aria-invalid={hasErr('name')} aria-describedby="f1e" />{fieldErr('f1', errors.name)}</div>
        <div className="lf-fld" style={css('flex: 1 1 240px')}><label htmlFor="f2">Phone number</label><input id="f2" className="lf-in" type="tel" autoComplete="tel" inputMode="tel" value={v.tel} onChange={(e) => set('tel', e.target.value)} aria-invalid={hasErr('tel')} aria-describedby="f2h" />{errors.tel ? <span id="f2h" className="lf-err"><Cross />{errors.tel}</span> : <span id="f2h" className="lf-hint">{FORM.hints.phone}</span>}</div>
      </div>
      <div style={css('display: flex; flex-wrap: wrap; gap: 18px')}>
        <div className="lf-fld" style={css('flex: 1 1 240px')}><label htmlFor="f3">Email <span className="lf-opt">(optional)</span></label><input id="f3" className="lf-in" type="email" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} aria-invalid={hasErr('email')} aria-describedby="f3e" />{fieldErr('f3', errors.email)}</div>
        <div className="lf-fld" style={css('flex: 1 1 240px')}><label htmlFor="f4">What is it about?</label><select id="f4" className="lf-in" value={v.area} onChange={(e) => set('area', e.target.value)}>{D.areaOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
      </div>
      <div className="lf-fld">
        <label htmlFor="f5">Briefly, what has happened?</label>
        <span id="f5h" className="lf-hint">{FORM.hints.description}</span>
        <textarea id="f5" className="lf-in" rows={5} maxLength={600} value={v.msg} onChange={(e) => set('msg', e.target.value)} aria-invalid={hasErr('msg')} aria-describedby="f5h f5c f5e" style={css('resize: vertical')} />
        <span style={css('display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap')}>{fieldErr('f5', errors.msg)}<span id="f5c" className="lf-hint" style={css('margin-left: auto')}>{FORM.hints.counter.replace('{n}', String(v.msg.length))}</span></span>
      </div>
      <fieldset style={css('border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px')}>
        <legend style={css('font-weight: 600; margin-bottom: 8px')}>When suits you for a call back? <span className="lf-opt">(optional)</span></legend>
        <div style={css('display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end')}>
          <div className="lf-fld" style={css('flex: 1 1 200px')}><label htmlFor="f6" className="lf-sr">Day</label><select id="f6" className="lf-in" value={v.day} onChange={(e) => set('day', e.target.value)}>{D.dayOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
          <div role="radiogroup" aria-label="Time of day" style={css('display: flex; flex-wrap: wrap; gap: 8px; flex: 2 1 280px')}>
            {D.todOpts.map((t) => <button key={t} type="button" role="radio" className="lf-chip" aria-checked={v.tod === t} onClick={() => set('tod', v.tod === t ? '' : t)}>{t}</button>)}
          </div>
        </div>
        <span className="lf-hint">{FORM.hints.callback}</span>
      </fieldset>
      <div className="lf-fld" style={css('gap: 8px')}>
        <label className="lf-tick" htmlFor="f7"><input id="f7" type="checkbox" checked={v.ok} onChange={(e) => set('ok', e.target.checked)} aria-invalid={hasErr('ok')} aria-describedby="f7n f7e" /><span style={css('font-weight: 400')}>I agree that Ravell Ndaba Attorneys may contact me about this request.</span></label>
        {errors.ok && <span id="f7e" className="lf-err" style={css('padding-left: 36px')}><Cross />{errors.ok}</span>}
        <p id="f7n" className="lf-hint" style={css('padding-left: 36px')}>Only our attorneys and one assistant see what you send. We use it to reply, to run a conflict check (making sure we don’t already act for the other side) and to prepare for your consultation, and we keep it for [period]. [Privacy notice link]</p>
      </div>
      <div style={css('display: flex; flex-wrap: wrap; align-items: center; gap: 14px 20px; border-top: 1px solid #DCD3C5; padding-top: 20px')}>
        <button type="submit" className="lf-b lf-b-clay" aria-disabled={sending}>{sending && <span className="lf-spin" aria-hidden="true" />}{sending ? FORM.button.sending : FORM.button.idle}</button>
        <span style={css('display: flex; align-items: center; gap: 8px; font-size: .9375rem; color: #5B5348')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={css('flex: none')}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>What you write is treated as confidential.</span>
      </div>
    </form>
  );
}
