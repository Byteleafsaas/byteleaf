'use client';

import { useEffect, useState, type FormEvent } from 'react';
import s from '@/components/admin/admin.module.css';
import t from '@/components/admin/settings.module.css';
import { useAdmin } from '@/lib/admin/store';
import { beginTwoStepSetupAction, confirmTwoStepSetupAction, disableTwoStepAction, regenerateBackupCodesAction, twoStepStatusAction } from '@/lib/server/actions/twostep';

type Mode = 'idle' | 'password' | 'scan' | 'codes' | 'disable' | 'regen';

/** Two-step verification (TOTP) for the signed-in admin: enrol with a QR code, backup codes, turn off. */
export default function TwoStepCard({ enabled }: { enabled: boolean }) {
  const { notify, refresh } = useAdmin();
  const [mode, setMode] = useState<Mode>('idle');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (enabled) void twoStepStatusAction().then((r) => setLeft(r.backupLeft));
  }, [enabled]);

  const close = () => {
    setMode('idle');
    setErr('');
    setQr('');
    setSecret('');
    setCodes([]);
  };
  const form = (e: FormEvent<HTMLFormElement>) => new FormData(e.currentTarget);

  const begin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await beginTwoStepSetupAction(String(form(e).get('password') ?? ''));
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setQr(r.qr);
    setSecret(r.secret);
    setMode('scan');
  };
  const confirm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await confirmTwoStepSetupAction(String(form(e).get('code') ?? ''));
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setCodes(r.backupCodes);
    setMode('codes');
    refresh();
  };
  const disable = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = form(e);
    setBusy(true);
    setErr('');
    const r = await disableTwoStepAction(String(fd.get('password') ?? ''), String(fd.get('code') ?? ''));
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    close();
    notify('Two-step verification is off.');
    refresh();
  };
  const regen = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = form(e);
    setBusy(true);
    setErr('');
    const r = await regenerateBackupCodesAction(String(fd.get('password') ?? ''), String(fd.get('code') ?? ''));
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setCodes(r.backupCodes);
    setLeft(r.backupCodes.length);
    setMode('codes');
  };

  const download = () => {
    const blob = new Blob([`byteleaf admin backup codes\nEach code works once.\n\n${codes.join('\n')}\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'byteleaf-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pw = (id: string) => (
    <div className={s.fg}>
      <label htmlFor={id} className={s.label}>Your password</label>
      <input id={id} name="password" className={s.field} type="password" autoComplete="current-password" required />
    </div>
  );
  const code = (id: string) => (
    <div className={s.fg}>
      <label htmlFor={id} className={s.label}>Code from your app (or a backup code)</label>
      <input id={id} name="code" className={s.field} type="text" autoComplete="one-time-code" inputMode="text" required style={{ fontFamily: 'var(--font-mono)' }} />
    </div>
  );
  const error = err && <span className={t.err} role="alert">{err}</span>;

  return (
    <div className={t.card}>
      <div className={t.cardRow}>
        <span className={t.cardText}>
          <span id="tfa">Two-step verification</span>
          <span className={t.hint}>
            {enabled ? `On. Signing in needs a code from your authenticator app.${left !== null ? ` ${left} backup ${left === 1 ? 'code' : 'codes'} left.` : ''}` : 'Ask for a code from an authenticator app when signing in.'}
          </span>
        </span>
        {mode === 'idle' && !enabled && <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setMode('password')}>Set up</button>}
        {mode === 'idle' && enabled && (
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setMode('regen')}>New backup codes</button>
            <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} onClick={() => setMode('disable')}>Turn off</button>
          </div>
        )}
      </div>

      {mode === 'password' && (
        <form onSubmit={begin} className={s.formCol} style={{ padding: 0 }}>
          <span className={t.hint}>Confirm your password to start.</span>
          {pw('ts-pw')}
          {error}
          <div className={s.btnRow}>
            <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy}>Continue</button>
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={close}>Cancel</button>
          </div>
        </form>
      )}

      {mode === 'scan' && (
        <form onSubmit={confirm} className={s.formCol} style={{ padding: 0 }}>
          <span className={t.hint}>1. Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy…).</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code to add byteleaf to your authenticator app" width={220} height={220} style={{ borderRadius: 12, border: '1px solid var(--line)', alignSelf: 'flex-start' }} />
          <span className={t.hint}>Can&apos;t scan? Enter this key instead: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)', overflowWrap: 'anywhere' }}>{secret}</span></span>
          <div className={s.fg}>
            <label htmlFor="ts-code" className={s.label}>2. Enter the 6-digit code it shows</label>
            <input id="ts-code" name="code" className={s.field} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required style={{ fontFamily: 'var(--font-mono)', maxWidth: 200 }} />
          </div>
          {error}
          <div className={s.btnRow}>
            <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy}>Turn on</button>
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={close}>Cancel</button>
          </div>
        </form>
      )}

      {mode === 'codes' && (
        <div className={s.formCol} style={{ padding: 0 }}>
          <div className={s.warnBox} style={{ background: 'var(--blue-50)', borderColor: 'var(--blue-100)', color: 'var(--blue-800)' }}>
            <span>Save these backup codes somewhere safe. Each works once if you lose your phone. <strong>They won&apos;t be shown again.</strong></span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 15 }}>
            {codes.map((c) => <li key={c} style={{ padding: '8px 12px', background: 'var(--surface-3)', borderRadius: 8 }}>{c}</li>)}
          </ul>
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => { void navigator.clipboard?.writeText(codes.join('\n')); notify('Backup codes copied.'); }}>Copy</button>
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={download}>Download</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} onClick={() => { close(); notify('Two-step verification is on.'); }}>I&apos;ve saved them</button>
          </div>
        </div>
      )}

      {(mode === 'disable' || mode === 'regen') && (
        <form onSubmit={mode === 'disable' ? disable : regen} className={s.formCol} style={{ padding: 0 }}>
          <span className={t.hint}>{mode === 'disable' ? 'Enter your password and a current code to turn it off.' : 'Enter your password and a current code. The old backup codes stop working.'}</span>
          {pw('ts-pw2')}
          {code('ts-code2')}
          {error}
          <div className={s.btnRow}>
            <button type="submit" className={`${s.btn} ${mode === 'disable' ? s.btnDangerSolid : s.btnPrimary} ${s.btnSm}`} disabled={busy}>{mode === 'disable' ? 'Turn off' : 'Create new codes'}</button>
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={close}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
