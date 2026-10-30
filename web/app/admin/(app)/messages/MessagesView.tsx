'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ICON, PathIcon } from '@/components/admin/icons';
import { Avatar, PillTabs, SearchBox, TopBar } from '@/components/admin/Ui';
import s from '@/components/admin/admin.module.css';
import { useAdmin } from '@/lib/admin/store';
import type { Message } from '@/lib/admin/types';
import { updateMessageAction } from '@/lib/server/actions/messages';

type Tab = 'inbox' | 'unread' | 'archived';
const TABS: [Tab, string][] = [['inbox', 'Inbox'], ['unread', 'Unread'], ['archived', 'Archived']];
const GROUPS: Record<Tab, (m: Message) => boolean> = {
  inbox: (m) => !m.archived,
  unread: (m) => !m.read && !m.archived,
  archived: (m) => m.archived,
};

export default function MessagesView() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { messages, setMessages, notify, refresh } = useAdmin();
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && tabParam in GROUPS ? tabParam : 'inbox';
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(params.get('id') ?? messages.find((m) => !m.archived)?.id ?? null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Optimistic update, then persist; refresh() adopts the database state if the save failed.
  const patch = (id: string, p: Partial<Message>) => {
    setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...p } : m)));
    void updateMessageAction({ id, read: p.read, archived: p.archived }).then((r) => !r.ok && refresh());
  };
  const sel = messages.find((m) => m.id === selId) ?? null;
  const term = q.trim().toLowerCase();
  const rows = messages.filter(GROUPS[tab]).filter((m) => !term || `${m.name} ${m.company} ${m.message}`.toLowerCase().includes(term));

  // Opening a message marks it as read.
  useEffect(() => {
    const m = messages.find((x) => x.id === selId);
    if (m && !m.read) {
      setMessages((all) => all.map((x) => (x.id === selId ? { ...x, read: true } : x)));
      void updateMessageAction({ id: m.id, read: true });
    }
  }, [selId]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (id: string) => {
    setSelId(id);
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };
  const toggleArchive = () => {
    if (!sel) return;
    const was = sel.archived;
    patch(sel.id, { archived: !was });
    notify(was ? 'Moved back to inbox.' : 'Message archived.', () => patch(sel.id, { archived: was }));
  };

  return (
    <>
      <TopBar crumb="Admin / Messages" title="Messages">
        <SearchBox label="Search messages" placeholder="Search messages…" value={q} onChange={setQ} />
      </TopBar>

      <div className={s.content}>
        <PillTabs label="Filter messages" value={tab} onChange={(t) => router.replace(`/admin/messages?tab=${t}`)} tabs={TABS.map(([key, label]) => ({ key, label, count: messages.filter(GROUPS[key]).length }))} />

        <div className={s.panes}>
          <section className={`${s.panel} ${s.rise} ${s.ov}`} aria-label="Message list" style={{ flex: '1 1 340px', minWidth: 0 }}>
            {rows.length ? (
              <ul className={s.ul}>
                {rows.map((m) => (
                  <li key={m.id} className={m.read ? '' : s.unread}>
                    <button type="button" className={s.mrow} aria-pressed={m.id === selId} onClick={() => open(m.id)}>
                      <span aria-hidden="true" className={`${s.dot} ${m.read ? '' : s.dotOn}`} />
                      <span className={s.msgMain}>
                        <span className={s.msgTop}>
                          <span className={s.msgName}>{m.name}</span>
                          <span className={s.monoSm} style={{ whiteSpace: 'nowrap' }}>{m.when}</span>
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{m.company}</span>
                        <span className={s.ellip}>{m.message}</span>
                        <span className={s.needTags}>{m.needs.map((n) => <span key={n} className={s.needTag}>{n}</span>)}</span>
                      </span>
                      <span className={s.sr}>{m.read ? 'Read' : 'Unread'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={s.emptyBox}>
                <strong>Inbox zero</strong>
                <span>No messages in this view.</span>
              </div>
            )}
          </section>

          {sel && (
            <article className={`${s.panel} ${s.slideIn}`} aria-label="Message" key={sel.id} style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <header className={s.msgHead}>
                <div className={s.msgWho}>
                  <Avatar name={sel.name} large />
                  <div className={s.col}>
                    <h2 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>{sel.name}</h2>
                    <span>{sel.company} · <span className={s.monoSm}>{sel.received}</span></span>
                  </div>
                </div>
                <div className={s.btnRow}>
                  <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ minHeight: 40 }} onClick={() => patch(sel.id, { read: !sel.read })}>{sel.read ? 'Mark as unread' : 'Mark as read'}</button>
                  <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ minHeight: 40 }} onClick={toggleArchive}>
                    <PathIcon d={ICON.archive} size={16} />
                    {sel.archived ? 'Move to inbox' : 'Archive'}
                  </button>
                </div>
              </header>
              <div className={s.msgBody}>
                <dl className={s.infoDl}>
                  <div><dt className={s.mini}>EMAIL</dt><dd><a href={`mailto:${sel.email}`}>{sel.email}</a></dd></div>
                  <div><dt className={s.mini}>PHONE</dt><dd><a href={`tel:${sel.phone.replace(/\s/g, '')}`}>{sel.phone}</a></dd></div>
                  <div><dt className={s.mini}>WORKING MODEL</dt><dd style={{ fontWeight: 500 }}>{sel.model}</dd></div>
                  <div><dt className={s.mini}>WANTS TO START</dt><dd style={{ fontWeight: 500 }}>{sel.start}</dd></div>
                </dl>
                <div className={s.fg} style={{ gap: 10 }}>
                  <span className={s.mini}>HELP WITH</span>
                  <div className={s.chips}>{sel.needs.map((n) => <span key={n} className={s.helpChip}>{n}</span>)}</div>
                </div>
                <div className={s.fg} style={{ gap: 10 }}>
                  <span className={s.mini}>MESSAGE</span>
                  <p className={s.msgText}>{sel.message}</p>
                </div>
                <div className={s.msgActions}>
                  <a className={`${s.btn} ${s.btnPrimary}`} href={`mailto:${sel.email}?subject=${encodeURIComponent('Re: your message to byteleaf')}`}>
                    <PathIcon d={ICON.reply} sw={2} />
                    Reply by email
                  </a>
                  <a className={`${s.btn} ${s.btnGhost}`} href={`tel:${sel.phone.replace(/\s/g, '')}`}>Call {sel.name.split(' ')[0]}</a>
                  <Link className={`${s.btn} ${s.btnGhost}`} href="/admin/bookings">View bookings</Link>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </>
  );
}
