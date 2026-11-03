'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { requestStaffLinkAction } from '@/lib/server/actions/assistant-staff';
import s from './staff.module.css';

export default function StaffGate({ domain, expired }: { domain: string; expired: boolean }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(expired ? 'That sign-in link has expired or was already used. Ask for a new one.' : '');
  const [sent, setSent] = useState<{ to: string; demoLink: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await requestStaffLinkAction(email).catch(() => ({ ok: false as const, error: 'That didn’t send. Check your connection and try again.' }));
    setBusy(false);
    if (res.ok) setSent({ to: email.trim(), demoLink: res.demoLink }); else setError(res.error);
  }

  return (
    <div className={s.gate}>
      <div className={s.gCard}>
        <span className={s.gIco} aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z" /></svg></span>
        {sent ? (
          <>
            <h1>Check your email</h1>
            <p>We sent a one-time sign-in link to <strong>{sent.to}</strong>. It works once and expires in 15 minutes.</p>
            <div className={s.gOk} role="status">This is a demo business, so there is no real inbox behind that address. Use the button below to open the link yourself.</div>
            <a className={s.gBtn} href={sent.demoLink}>Open the sign-in link</a>
            <button type="button" className={`${s.gBtn} ${s.gBtnGhost}`} onClick={() => setSent(null)}>Use a different email</button>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'contents' }} noValidate>
            <h1>Staff only</h1>
            <p>This assistant answers from internal documents like the install checklist and sales playbook. Sign in with your work email to use it.</p>
            <label htmlFor="g-email">Work email</label>
            <input id="g-email" type="email" autoComplete="email" placeholder={`[name]@${domain}`} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby="g-help" />
            <small id="g-help">Only @{domain} addresses can sign in.</small>
            {error && <div className={s.gErr} role="alert">{error}</div>}
            <button type="submit" className={s.gBtn} disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send me a sign-in link'}</button>
            <small>Not staff? The public assistant is on <Link href="/projects/knowledge-chatbot">our website</Link>.</small>
          </form>
        )}
      </div>
    </div>
  );
}
