'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { discardAction, publishAction, undoPublishAction } from '@/lib/server/actions/launch';
import type { PublishInfo } from '@/lib/server/launch/admin';
import b from '../booking-admin/booking.module.css';
import w from './w.module.css';

type Phase = '' | 'confirm' | 'publishing' | 'discard';

/**
 * The publish bar (HANDOFF-LAUNCH §5). It shows whenever something is saved but not yet live, says so in plain words, and
 * publishes all of it in one step. After publishing there are ten seconds to undo. A failed publish changes nothing live.
 */
export default function PublishBar({ publish, previewHref }: { publish: PublishInfo; previewHref: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const n = publish.changes.length;
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && (phase === 'confirm' || phase === 'discard')) setPhase(''); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase]);

  const flash = (text: string, undo?: () => void, ms = 4000) => { clearTimeout(timer.current); setToast({ text, undo }); timer.current = setTimeout(() => setToast(null), ms); };

  const doPublish = async () => {
    setPhase('publishing'); setError('');
    const r = await publishAction();
    if (!r.ok) { setPhase(''); setError('Couldn’t publish. Nothing changed on your live site and your edits are safe.'); return; }
    setPhase('');
    flash('Published. Your site is up to date.', async () => { const u = await undoPublishAction(r.version); flash(u.ok ? 'Undone. Your changes are waiting to be published again.' : u.error); router.refresh(); }, 10000);
    router.refresh();
  };
  const doDiscard = async () => { setPhase(''); await discardAction(); flash('Edits removed. Your live site is exactly as it was.'); router.refresh(); };

  return (
    <>
      {n > 0 && (
        <div className={w.pubBar} role="region" aria-label="Publish changes">
          <div className={w.pubText}>
            <strong>{n} {n === 1 ? 'change' : 'changes'} not published</strong>
            <span>Saved, but your live site doesn’t show {n === 1 ? 'it' : 'them'} yet</span>
          </div>
          <div className={w.pubBtns}>
            <a className={`${b.btn} ${b.btnSm} ${w.ghost}`} href={previewHref} target="_blank" rel="noopener noreferrer">Preview</a>
            <button type="button" className={`${b.btn} ${b.btnSm} ${w.ghost}`} onClick={() => setPhase('discard')}>Discard</button>
            <button type="button" className={`${b.btn} ${b.btnSm} ${b.btnPrimary}`} onClick={() => setPhase('confirm')} disabled={phase === 'publishing'}>{error ? 'Try again' : phase === 'publishing' ? 'Publishing…' : 'Publish'}</button>
          </div>
          {error && <div role="alert" className={w.pubErr}>{error}</div>}
        </div>
      )}

      {(phase === 'confirm' || phase === 'publishing') && (
        <div className={b.scrim} onClick={() => phase === 'confirm' && setPhase('')}>
          <div className={b.modal} role="alertdialog" aria-modal="true" aria-labelledby="pb-h" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 id="pb-h">Publish {n} {n === 1 ? 'change' : 'changes'}?</h2>
            <p>Customers will see this straight away.</p>
            <ul className={w.changeList}>{publish.changes.map((c) => <li key={c.id}>{c.label}</li>)}</ul>
            <span className={b.modalActions}>
              <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={() => setPhase('')} disabled={phase === 'publishing'}>Not yet</button>
              <button type="button" className={`${b.btn} ${b.btnPrimary}`} onClick={doPublish} disabled={phase === 'publishing'} autoFocus>{phase === 'publishing' ? 'Publishing…' : 'Publish now'}</button>
            </span>
          </div>
        </div>
      )}

      {phase === 'discard' && (
        <div className={b.scrim} onClick={() => setPhase('')}>
          <div className={b.modal} role="alertdialog" aria-modal="true" aria-labelledby="pd-h" onClick={(e) => e.stopPropagation()}>
            <h2 id="pd-h">Discard {n} {n === 1 ? 'change' : 'changes'}?</h2>
            <p>These edits are removed. Your live site stays exactly as it is now.</p>
            <span className={b.modalActions}>
              <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={() => setPhase('')} autoFocus>Keep editing</button>
              <button type="button" className={`${b.btn} ${b.btnRed}`} onClick={doDiscard}>Discard changes</button>
            </span>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className={`${b.toast} ${b.toastRow}`}>
          <span>{toast.text}</span>
          {toast.undo && <button type="button" className={w.toastBtn} onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}
        </div>
      )}
    </>
  );
}
