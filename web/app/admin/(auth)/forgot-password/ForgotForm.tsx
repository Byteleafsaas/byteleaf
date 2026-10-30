'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import a from '@/components/admin/auth.module.css';
import { PathIcon } from '@/components/admin/icons';
import { forgotPasswordAction } from '@/lib/server/actions/auth';

export default function ForgotForm() {
  const [sent, setSent] = useState(false);

  const [busy, setBusy] = useState(false);

  // The server answers identically whether or not the address belongs to an admin.
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    await forgotPasswordAction(String(new FormData(e.currentTarget).get('email') ?? ''));
    setBusy(false);
    setSent(true);
  };

  return (
    <>
      {!sent ? (
        <>
          <div className={`${a.rise} ${a.head}`}>
            <h1 className={a.h1}>Forgot your password?</h1>
            <p className={a.sub}>Enter the email you sign in with and we&apos;ll send you a link to reset it.</p>
          </div>
          <form className={`${a.rise} ${a.d1} ${a.form}`} onSubmit={submit}>
            <div className={a.fg}>
              <label htmlFor="f-email">Email</label>
              <input id="f-email" name="email" className={a.field} type="email" autoComplete="username" placeholder="you@byteleaf.co.za" required />
            </div>
            <button type="submit" className={`${a.btn} ${a.primary} ${a.block}`} disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        </>
      ) : (
        <div className={a.state} role="status">
          <span className={a.stateIco}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
          </span>
          <h1 className={a.h1}>Check your inbox</h1>
          <p className={a.sub}>If that email belongs to an admin account, a reset link is on its way. The link expires in [X] minutes.</p>
          <div className={a.btns}>
            <button type="button" className={`${a.btn} ${a.ghost}`} onClick={() => setSent(false)}>Use a different email</button>
          </div>
        </div>
      )}
      <Link className={`${a.rise} ${a.d2} ${a.back}`} href="/admin/login">
        <PathIcon d="M19 12H5M11 18l-6-6 6-6" size={16} sw={2} />
        Back to sign in
      </Link>
    </>
  );
}
