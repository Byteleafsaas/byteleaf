'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingInfo } from '@/lib/admin/booking-info';
import { handBackAction, replyAction, sendTemplateAction, takeOverAction } from '@/lib/server/actions/whatsapp-inbox';
import type { InboxData } from '@/lib/server/whatsapp/inbox';
import { STATUS_STRIP, canReply } from '@/lib/whatsapp/inbox-model';
import s from './booking.module.css';

const DOT: Record<string, string> = { asked: '#D92D20', taken: '#8B2F7E', assistant: 'transparent' };

export default function InboxView({ data, selected }: { data: InboxData; selected: string }) {
  const router = useRouter();
  const biz = useBookingInfo();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const open = data.open;

  // New messages arrive by themselves: look again every 15 seconds while the page is open.
  useEffect(() => { const i = setInterval(() => router.refresh(), 15000); return () => clearInterval(i); }, [router]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [open?.messages.length, open?.id]);
  useEffect(() => { setMsg(''); setText(''); }, [open?.id]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string; sent?: boolean }>, ok?: (sent: boolean) => string) => {
    setBusy(true); setMsg('');
    const r = await fn();
    setBusy(false);
    if (!r.ok) { setMsg(r.error ?? 'That didn’t work.'); return; }
    if (ok) setMsg(ok(Boolean(r.sent)));
    router.refresh();
  };

  const strip = open ? STATUS_STRIP[open.status] : null;
  const can = open ? canReply(open.status, open.window.open) : false;
  const send = (e: FormEvent) => { e.preventDefault(); if (!open || !text.trim()) return; run(() => replyAction(open.id, text), () => ''); setText(''); };

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.titleBox}><span className={s.crumb}>{biz.name} / Booking</span><h1 className={s.h1}>Inbox</h1></div>
        <span className={s.hint}>{data.waiting ? `${data.waiting} waiting for a person` : 'Nobody is waiting for a person'}</span>
      </header>
      <div className={s.inboxBody}>
        <nav className={`${s.inboxList} ${open ? s.inboxListHide : ''}`} aria-label="Chats">
          {data.chats.map((c) => (
            <Link key={c.id} href={`/admin/bookings/inbox?chat=${c.id}`} className={`${s.chatItem} ${selected === c.id ? s.chatItemOn : ''}`} aria-current={selected === c.id ? 'page' : undefined}>
              <span className={s.chatTop}><strong>{c.name}</strong><span className={s.mono} style={{ fontSize: 10, color: '#4B5872' }}>{c.at}</span></span>
              <span className={s.chatPrev}>{c.preview}</span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {c.status === 'asked' && <span className={s.flagPill}>ASKED FOR A PERSON</span>}
                {c.status === 'taken' && <span className={s.takenPill}>YOU HAVE IT</span>}
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: DOT[c.status] }} />
              </span>
            </Link>
          ))}
          {!data.chats.length && <p className={s.hint} style={{ padding: 18 }}>No chats yet. They appear here when clients message the number.</p>}
        </nav>

        <section className={`${s.thread} ${open ? '' : s.threadHide}`} aria-label="Conversation">
          {!open ? (
            <div className={s.empty}><h2 style={{ margin: 0, fontSize: 20 }}>Choose a chat</h2><p className={s.hint}>Clients who ask for a person are flagged. Take over, reply, then hand back.</p></div>
          ) : (
            <>
              <div className={s.threadHead}>
                <Link href="/admin/bookings/inbox" className={`${s.ibtn} ${s.backBtn}`} aria-label="Back to chats">‹</Link>
                <span style={{ flex: 1, minWidth: 0 }}><strong style={{ fontSize: 15 }}>{open.name}</strong> <span className={s.mono} style={{ fontSize: 12, color: '#4B5872' }}>{open.phone}</span></span>
                <span className={s.windowChip}>{open.window.label}</span>
              </div>
              <div role="status" className={s.strip} style={{ background: strip!.bg, color: strip!.fg }}>{open.status === 'assistant' ? strip!.text : open.status === 'asked' ? `${open.name} ${strip!.text}` : strip!.text}</div>
              <div className={s.msgsBox}>
                {open.messages.map((m, i) => (
                  <div key={i} className={s.msg} style={{ alignSelf: m.from === 'client' ? 'flex-end' : 'flex-start' }}>
                    <span className={s.who} style={{ textAlign: m.from === 'client' ? 'right' : 'left' }}>{m.who} · {m.at}</span>
                    <span className={s.bubble} style={m.from === 'client' ? { background: '#DCE6F4' } : m.from === 'staff' ? { background: '#F7ECF5', border: '1px solid #E8C9E2' } : { background: '#EEF2F8' }}>{m.text}</span>
                  </div>
                ))}
                <div ref={end} />
              </div>
              <div className={s.composer}>
                {open.status !== 'taken' && (
                  <>
                    <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={() => run(() => takeOverAction(open.id), (sent) => (sent ? 'You have the chat. They’ve been told who they’re talking to.' : 'You have the chat. The assistant stays quiet. (They couldn’t be messaged just now.)'))}>Take over</button>
                    <span className={s.hint}>Pauses the assistant for this chat</span>
                  </>
                )}
                {open.status === 'taken' && can && (
                  <form onSubmit={send} style={{ display: 'flex', gap: 8, flex: '1 1 260px', alignItems: 'flex-end' }}>
                    <label className={s.sr} htmlFor="reply">Your reply</label>
                    <textarea id="reply" className={s.field} rows={2} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Write to the client" style={{ resize: 'vertical', minHeight: 46 }} />
                    <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy || !text.trim()}>Send</button>
                  </form>
                )}
                {open.status === 'taken' && !can && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 260px' }}>
                    <span className={s.hint}>Their 24-hour window has closed, so a free message can’t be sent. {open.templates.length ? 'You can send an approved template instead.' : 'They need to message first, or have an upcoming booking for a template.'}</span>
                    {open.templates.map((t) => <button key={t.id} type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy} onClick={() => run(() => sendTemplateAction(open.id, t.id), () => 'Template sent.')}>{t.label}</button>)}
                  </div>
                )}
                {open.status === 'taken' && <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={busy} onClick={() => run(() => handBackAction(open.id), (sent) => (sent ? 'Handed back. The assistant is answering again.' : 'Handed back. The assistant answers the next message.'))}>Hand back to assistant</button>}
              </div>
              {msg && <p role="status" className={s.hint} style={{ margin: 0, padding: '0 14px 12px' }}>{msg}</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
