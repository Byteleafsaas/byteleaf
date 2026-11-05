'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setEnquiryStatusAction } from '@/lib/server/actions/launch';
import b from '../booking-admin/booking.module.css';

export type EnquiryView = { id: string; name: string; phone: string; area: string; wash: string; message: string; status: 'new' | 'read' | 'archived'; at: string };

export default function EnquiryRow({ e }: { e: EnquiryView }) {
  const router = useRouter();
  const [busy, go] = useTransition();
  const set = (status: EnquiryView['status']) => go(async () => { await setEnquiryStatusAction(e.id, status); router.refresh(); });
  const ghost = `${b.btn} ${b.btnSm} ${b.btnGhost}`;
  return (
    <li className={b.panel} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6, opacity: e.status === 'archived' ? 0.6 : 1 }}>
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', justifyContent: 'space-between' }}>
        <strong>{e.name}{e.status === 'new' && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--acc-t)', fontWeight: 600 }}>NEW</span>}</strong>
        <span className={b.hint}>{e.at}</span>
      </span>
      <span><a href={`tel:${e.phone.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--acc-t)', fontWeight: 600 }}>{e.phone}</a>{e.area && ` · ${e.area}`}{e.wash && ` · ${e.wash}`}</span>
      {e.message && <span style={{ overflowWrap: 'anywhere' }}>{e.message}</span>}
      <span style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {e.status === 'new' && <button type="button" className={ghost} disabled={busy} onClick={() => set('read')}>Mark as read</button>}
        {e.status !== 'archived'
          ? <button type="button" className={ghost} disabled={busy} onClick={() => set('archived')}>Archive</button>
          : <button type="button" className={ghost} disabled={busy} onClick={() => set('read')}>Restore</button>}
      </span>
    </li>
  );
}
