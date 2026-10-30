'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import a from '@/components/admin/auth.module.css';
import { resetPasswordAction } from '@/lib/server/actions/auth';

const PALETTE = ['#E3E9F2', '#B42318', '#9A5B00', '#1877F2', '#0B7A55'];
const LABELS = ['Start typing a password', 'Weak', 'Fair', 'Good', 'Strong'];
const OK = 'M5 12l5 5L20 7';
const DOT = 'M12 12h.01';

// Same rules are enforced on the server (HANDOFF-ADMIN §3).
export default function ResetForm({ token }: { token: string }) {
  const [p, setP] = useState('');
  const [p2, setP2] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const checks = [
    { label: 'At least 12 characters', ok: p.length >= 12 },
    { label: 'Upper and lower case letters', ok: /[a-z]/.test(p) && /[A-Z]/.test(p) },
    { label: 'At least one number', ok: /\d/.test(p) },
    { label: 'At least one symbol', ok: /[^A-Za-z0-9]/.test(p) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const valid = score === 4 && p === p2;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const r = await resetPasswordAction(token, p);
    setBusy(false);
    if (r.ok) setDone(true);
    else setErr(r.error);
  };

  if (done) {
    return (
      <div className={a.state} role="status">
        <span className={a.stateDisc}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="draw" d={OK} /></svg>
        </span>
        <h1 className={a.h1}>Password updated</h1>
        <p className={a.sub}>For safety, you&apos;ve been signed out on all other devices. Sign in with your new password.</p>
        <Link className={`${a.btn} ${a.primary}`} href="/admin/login">Go to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <div className={`${a.rise} ${a.head}`}>
        <h1 className={a.h1}>Set a new password</h1>
        <p className={a.sub}>Choose a password you don&apos;t use anywhere else.</p>
      </div>
      <form className={`${a.rise} ${a.d1} ${a.form}`} onSubmit={submit}>
        <div className={a.fg}>
          <label htmlFor="r-pass">New password</label>
          <input id="r-pass" className={a.field} type="password" autoComplete="new-password" placeholder="At least 12 characters" value={p} onChange={(e) => setP(e.target.value)} required />
          <div aria-hidden="true" className={a.bars}>
            {[0, 1, 2, 3].map((i) => <span key={i} className={a.bar} style={p && i < score ? { background: PALETTE[score] } : undefined} />)}
          </div>
          <span aria-live="polite" className={a.strength} style={p && score ? { color: PALETTE[score] } : undefined}>{p ? `Strength: ${LABELS[score]}` : LABELS[0]}</span>
        </div>
        <ul className={a.reqs}>
          {checks.map((c) => (
            <li key={c.label} className={`${a.req} ${c.ok ? a.reqOk : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={c.ok ? OK : DOT} /></svg>
              {c.label}
              <span className={a.sr}>{c.ok ? ' — met' : ' — not met'}</span>
            </li>
          ))}
        </ul>
        <div className={a.fg}>
          <label htmlFor="r-pass2">Confirm new password</label>
          <input id="r-pass2" className={a.field} type="password" autoComplete="new-password" placeholder="Type it again" value={p2} onChange={(e) => setP2(e.target.value)} required />
          {p2.length > 0 && p2 !== p && <span className={a.mismatch}>Passwords don&apos;t match yet.</span>}
        </div>
        {err && <div role="alert" className={a.alert}><span>{err}</span></div>}
        <button type="submit" className={`${a.btn} ${a.primary} ${a.block}`} disabled={!valid || busy}>{busy ? 'Updating…' : 'Update password'}</button>
      </form>
    </>
  );
}
