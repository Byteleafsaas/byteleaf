'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MESSAGES, enquiryProblems, firstName, type EnquiryErrors } from '@/lib/launch/enquiry';
import s from '../site.module.css';

type Props = { areas: string[]; washes: string[]; afterText: string };

/**
 * The booking request form. Empty, filling, sending, then either the sent card (which says what happens next) or a failed
 * alert above the form with every field kept. Focus moves to whichever of those appears, so a screen reader hears it.
 */
export default function EnquiryForm({ areas, washes, afterText }: Props) {
  const areaOptions = [...areas, 'Somewhere else'];
  const [f, setF] = useState({ name: '', phone: '', area: areaOptions[0] ?? '', wash: washes[0] ?? '', message: '', website: '' });
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [phase, setPhase] = useState<'form' | 'sending' | 'sent' | 'failed'>('form');
  const failedOnce = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (phase === 'sent') sentRef.current?.focus(); if (phase === 'failed') alertRef.current?.focus(); }, [phase]);

  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); if (k === 'name' || k === 'phone') setErrors((e) => ({ ...e, [k]: undefined })); };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const problems = enquiryProblems(f);
    if (Object.keys(problems).length) { setErrors(problems); return; }
    setPhase('sending');
    try {
      // `?form=fails` makes the first send fail, so the failed state can be shown in the demo.
      const demoFail = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('form') === 'fails' && !failedOnce.current;
      if (demoFail) { failedOnce.current = true; await new Promise((r) => setTimeout(r, 700)); throw new Error('demo'); }
      const res = await fetch('/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
      if (res.status === 422) { const j = await res.json(); setErrors(j.errors ?? {}); setPhase('form'); return; }
      if (!res.ok) throw new Error('failed');
      setPhase('sent');
    } catch {
      setPhase('failed');
    }
  };

  if (phase === 'sent') {
    return (
      <div className={`${s.card} ${s.sent}`} role="status">
        <span className={s.tick} aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></span>
        <h2 ref={sentRef} tabIndex={-1} style={{ fontSize: 30 }}>Thanks, {firstName(f.name)}. We’ve got it.</h2>
        <p>{afterText} We have your number as <strong>{f.phone}</strong>, for your {f.wash} in {f.area}.</p>
        <p className={s.muted}>Need it sooner? Message us on WhatsApp and mention your name.</p>
        <button type="button" className={`${s.b} ${s.bLine}`} style={{ alignSelf: 'flex-start' }} onClick={() => { setF({ name: '', phone: '', area: areaOptions[0] ?? '', wash: washes[0] ?? '', message: '', website: '' }); setPhase('form'); }}>Send another request</button>
      </div>
    );
  }

  const sending = phase === 'sending';
  return (
    <form className={s.card} onSubmit={send} noValidate aria-labelledby="fh" style={{ padding: 28, gap: 18 }}>
      <h2 id="fh" style={{ fontSize: 28 }}>Ask for a booking</h2>
      {phase === 'failed' && <div ref={alertRef} tabIndex={-1} role="alert" className={s.alert}><strong>That didn’t send.</strong> {MESSAGES.sendFailed.replace('That didn’t send. ', '')}</div>}
      <div className={s.fld}>
        <label htmlFor="f1">Your name</label>
        <input id="f1" className={s.in} autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby="f1h" />
        {errors.name && <span id="f1h" role="alert" className={s.hint} style={{ color: '#B42318' }}>{errors.name}</span>}
      </div>
      <div className={s.fld}>
        <label htmlFor="f2">Phone number</label>
        <input id="f2" className={s.in} type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby="f2h" />
        <span id="f2h" role={errors.phone ? 'alert' : undefined} className={s.hint} style={{ color: errors.phone ? '#B42318' : '#4D5A50' }}>{errors.phone ?? 'So we can confirm your time. We don’t share it.'}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div className={s.fld} style={{ flex: '1 1 180px' }}><label htmlFor="f3">Area</label><select id="f3" className={s.in} value={f.area} onChange={(e) => set('area', e.target.value)}>{areaOptions.map((o) => <option key={o}>{o}</option>)}</select></div>
        <div className={s.fld} style={{ flex: '1 1 180px' }}><label htmlFor="f4">Wash</label><select id="f4" className={s.in} value={f.wash} onChange={(e) => set('wash', e.target.value)}>{washes.map((o) => <option key={o}>{o}</option>)}</select></div>
      </div>
      <div className={s.fld}>
        <label htmlFor="f5">Anything we should know? <span style={{ fontWeight: 400, color: '#4D5A50' }}>(optional)</span></label>
        <textarea id="f5" className={s.in} rows={3} value={f.message} onChange={(e) => set('message', e.target.value)} placeholder="e.g. parked in the basement at work" maxLength={600} />
      </div>
      {/* A field real visitors never see: bots fill it in. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: -9999, height: 0, overflow: 'hidden' }}><label htmlFor="f6">Website</label><input id="f6" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></div>
      <button type="submit" className={`${s.b} ${s.bSun}`} disabled={sending} style={{ alignSelf: 'flex-start' }}>{sending ? <><span className={s.spin} aria-hidden="true" />Sending…</> : phase === 'failed' ? 'Try again' : 'Send request'}</button>
      <p className={s.muted} style={{ fontSize: 14 }}>We only use your number to arrange the wash. [Privacy notice link]</p>
    </form>
  );
}
