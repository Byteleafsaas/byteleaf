'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowIcon } from '@/components/Icon';
import a from '@/components/admin/auth.module.css';
import { loginAction } from '@/lib/server/actions/auth';
import { verifyTwoStepAction } from '@/lib/server/actions/twostep';
import { PathIcon } from '@/components/admin/icons';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [show, setShow] = useState(false);
  // `?state=error` previews the error banner (matches the design reference).
  const [error, setError] = useState(params.get('state') === 'error');

  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'password' | 'code'>('password');
  const [backup, setBackup] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const r = await loginAction({
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
      remember: fd.get('remember') === 'on',
      next: params.get('next') ?? undefined,
    });
    if (r.ok && r.twoStep) {
      setBusy(false);
      setError(false);
      setStep('code');
      return;
    }
    if (r.ok) {
      router.push(r.next);
      router.refresh();
      return;
    }
    setBusy(false);
    setMsg(r.error);
    setError(true);
  };

  const verify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const r = await verifyTwoStepAction(String(new FormData(e.currentTarget).get('code') ?? ''));
    if (r.ok) {
      router.push(r.next);
      router.refresh();
      return;
    }
    setBusy(false);
    setMsg(r.error);
    setError(true);
    if (/expired|Too many/.test(r.error)) setStep('password');
  };

  if (step === 'code') {
    return (
      <>
        <div className={`${a.rise} ${a.head}`}>
          <h1 className={a.h1}>Two-step verification</h1>
          <p className={a.sub}>{backup ? 'Enter one of your backup codes. Each code works once.' : 'Enter the 6-digit code from your authenticator app.'}</p>
        </div>
        {error && (
          <div role="alert" className={a.alert}>
            <span>{msg}</span>
          </div>
        )}
        <form className={`${a.rise} ${a.d1} ${a.form}`} onSubmit={verify}>
          <div className={a.fg}>
            <label htmlFor="l-code">{backup ? 'Backup code' : 'Verification code'}</label>
            <input
              id="l-code" name="code" className={`${a.field} ${error ? a.fieldErr : ''}`} type="text" required autoFocus
              inputMode={backup ? 'text' : 'numeric'} autoComplete="one-time-code" maxLength={backup ? 12 : 7}
              placeholder={backup ? 'abcde-fghjk' : '123 456'} style={{ letterSpacing: backup ? undefined : '.2em', fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <button type="submit" className={`${a.btn} ${a.primary} ${a.block}`} disabled={busy}>{busy ? 'Verifying…' : 'Verify'}</button>
          <button type="button" className={`${a.btn} ${a.ghost} ${a.block}`} onClick={() => { setBackup((b) => !b); setError(false); }}>
            {backup ? 'Use my authenticator app' : 'Use a backup code'}
          </button>
        </form>
        <button type="button" className={`${a.back} ${a.backMuted}`} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }} onClick={() => { setStep('password'); setError(false); setBusy(false); }}>
          <PathIcon d="M19 12H5M11 18l-6-6 6-6" size={16} sw={2} />
          Back to sign in
        </button>
      </>
    );
  }

  return (
    <>
      <div className={`${a.rise} ${a.head}`}>
        <h1 className={a.h1}>Sign in</h1>
        <p className={a.sub}>Welcome back. Sign in to manage the byteleaf website.</p>
      </div>

      {error && (
        <div role="alert" className={a.alert}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          <span>{msg || "That email and password don't match. Check them and try again."}</span>
        </div>
      )}

      <form className={`${a.rise} ${a.d1} ${a.form}`} onSubmit={submit}>
        <div className={a.fg}>
          <label htmlFor="l-email">Email</label>
          <input id="l-email" className={`${a.field} ${error ? a.fieldErr : ''}`} name="email" type="email" autoComplete="username" placeholder="you@byteleaf.dev" required />
        </div>
        <div className={a.fg}>
          <div className={a.labelRow}>
            <label htmlFor="l-pass">Password</label>
            <Link href="/admin/forgot-password">Forgot password?</Link>
          </div>
          <div className={a.passWrap}>
            <input id="l-pass" className={`${a.field} ${error ? a.fieldErr : ''}`} name="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" required />
            <button type="button" className={a.eye} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((v) => !v)}>
              {show ? (
                <PathIcon d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.8M6.6 6.6A17 17 0 0 0 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 5.4-1.6" size={20} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>
        </div>
        <label className={a.check}><input type="checkbox" name="remember" defaultChecked />Keep me signed in on this device</label>
        <button type="submit" className={`${a.btn} ${a.primary} ${a.block}`} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
          <ArrowIcon className={a.arr} />
        </button>
      </form>

      <div className={`${a.rise} ${a.d2} ${a.note}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166FE5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        <span>Admin access only. Accounts are created by the site owner — there is no public sign-up.</span>
      </div>
      <Link className={`${a.rise} ${a.d3} ${a.back} ${a.backMuted}`} href="/">
        <PathIcon d="M19 12H5M11 18l-6-6 6-6" size={16} sw={2} />
        Back to byteleaf website
      </Link>
    </>
  );
}
