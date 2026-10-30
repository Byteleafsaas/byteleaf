'use client';

import { useState, type FormEvent } from 'react';
import { NEEDS, START_WHEN, WORK_TYPES } from '@/lib/content';
import { submitContactAction } from '@/lib/server/actions/public';
import { ArrowIcon } from '@/components/Icon';
import Select from '@/components/Select';
import s from './contact.module.css';

export default function ContactForm({ replyTime }: { replyTime: string }) {
  const [picked, setPicked] = useState<string[]>(['Maintenance']);
  const [sent, setSent] = useState(false);

  const toggle = (l: string) => setPicked((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    const r = await submitContactAction({
      needs: picked,
      name: String(fd.get('name') ?? ''), company: String(fd.get('company') ?? ''), email: String(fd.get('email') ?? ''), phone: String(fd.get('phone') ?? ''),
      workType: String(fd.get('workType') ?? ''), start: String(fd.get('start') ?? ''), message: String(fd.get('message') ?? ''),
      website: String(fd.get('website') ?? ''),
    });
    setBusy(false);
    if (r.ok) setSent(true);
    else setError(r.error);
  };

  if (sent) {
    return (
      <div className={s.sent} role="status">
        <span className={`popin ${s.disc}`}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path className="draw" d="M5 12l5 5L20 7" />
          </svg>
        </span>
        <h2>Message sent — thank you.</h2>
        <p>We&apos;ll be in touch within {replyTime}. If it&apos;s urgent, give us a call.</p>
        <button type="button" className="btn btn-ghost btn-lg" onClick={() => setSent(false)}>Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={s.form}>
      <fieldset className={s.fieldset}>
        <legend className={s.legend}>What can we help with?</legend>
        <div className={s.tchips}>
          {NEEDS.map((l) => (
            <button key={l} type="button" className={s.tchip} aria-pressed={picked.includes(l)} onClick={() => toggle(l)}>{l}</button>
          ))}
        </div>
      </fieldset>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      <div className="fgrid">
        <div className="fgroup"><label htmlFor="c-name">Your name</label><input id="c-name" name="name" className="field" type="text" placeholder="Thandi Mokoena" required autoComplete="name" /></div>
        <div className="fgroup"><label htmlFor="c-company">Company</label><input id="c-company" name="company" className="field" type="text" placeholder="Company name" autoComplete="organization" /></div>
        <div className="fgroup"><label htmlFor="c-email">Work email</label><input id="c-email" name="email" className="field" type="email" placeholder="you@company.co.za" required autoComplete="email" /></div>
        <div className="fgroup"><label htmlFor="c-phone">Phone <span>(optional)</span></label><input id="c-phone" name="phone" className="field" type="tel" placeholder="+27" autoComplete="tel" /></div>
      </div>
      <div className="fgrid">
        <div className="fgroup"><label htmlFor="c-type">How would you like to work?</label>
          <Select id="c-type" name="workType" options={WORK_TYPES} /></div>
        <div className="fgroup"><label htmlFor="c-when">When do you want to start?</label>
          <Select id="c-when" name="start" options={START_WHEN} /></div>
      </div>
      <div className="fgroup"><label htmlFor="c-msg">Tell us about it</label>
        <textarea id="c-msg" name="message" className={`field ${s.area}`} rows={5} placeholder="What systems do you run today, and what needs to change?" /></div>
      <div className={s.foot}>
        <span className={s.popia}>We only use your details to reply to you, in line with POPIA.</span>
        {error && <p role="alert" style={{ margin: 0, color: '#B42318', fontSize: 14 }}>{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? 'Sending…' : 'Send message'}
          <ArrowIcon />
        </button>
      </div>
    </form>
  );
}
