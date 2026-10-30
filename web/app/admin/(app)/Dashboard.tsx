'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ICON, PathIcon } from '@/components/admin/icons';
import { Avatar, StatusPill, TopBar } from '@/components/admin/Ui';
import s from '@/components/admin/admin.module.css';
import { addDaysKey, fmtDay, fmtLong, sastHour, todayKey } from '@/lib/admin/format';
import { useAdmin } from '@/lib/admin/store';
import { confirmBookingAction } from '@/lib/server/actions/bookings';

const DOT: Record<string, string> = { pending: '#C27C0E', confirmed: '#0B7A55', rescheduled: '#1877F2' };

export default function Dashboard() {
  const { bookings, setBookings, messages, projects, notify, refresh, user } = useAdmin();
  // Date and greeting depend on the clock, so compute after mount to avoid a hydration mismatch.
  const [now, setNow] = useState<{ today: string; hour: number } | null>(null);
  useEffect(() => setNow({ today: todayKey(), hour: sastHour() }), []);

  const today = now?.today ?? '';
  const greeting = !now ? 'Hello' : now.hour < 12 ? 'Good morning' : now.hour < 17 ? 'Good afternoon' : 'Good evening';

  const pending = bookings.filter((b) => b.status === 'pending');
  const unread = messages.filter((m) => !m.read && !m.archived);
  const active = bookings.filter((b) => ['pending', 'confirmed', 'rescheduled'].includes(b.status));
  const upcoming = today
    ? active.filter((b) => b.date >= today && b.date <= addDaysKey(today, 7)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    : [];
  const latest = messages.filter((m) => !m.archived).slice(0, 3);
  const live = projects.filter((x) => x.live).length;

  const confirm = (id: string, name: string) => {
    setBookings((all) => all.map((b) => (b.id === id ? { ...b, status: 'confirmed', history: [...b.history, { text: 'Confirmed by Gerald', when: 'Just now' }] } : b)));
    notify(`Booking confirmed — ${name} has been emailed.`);
    void confirmBookingAction(id).then((r) => {
      if (!r.ok) notify(r.error);
      refresh();
    });
  };

  const kpis = [
    { label: 'Awaiting confirmation', value: pending.length, cta: 'Review bookings', href: '/admin/bookings', icon: ICON.clock },
    { label: 'Unread messages', value: unread.length, cta: 'Open inbox', href: '/admin/messages', icon: ICON.messages },
    { label: 'Calls in next 7 days', value: upcoming.length, cta: 'See schedule', href: '/admin/bookings?tab=upcoming', icon: ICON.bookings },
    { label: 'Live projects', value: live, cta: 'Manage projects', href: '/admin/projects', icon: ICON.projects },
  ];

  return (
    <>
      <TopBar crumb={today ? fmtLong(today) : ' '} title={`${greeting}, ${user.name.split(' ')[0]}`}>
        <div className={s.searchWrap}>
          <label htmlFor="q" className={s.sr}>Search bookings, messages and projects</label>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d={ICON.search} /></svg>
          <input id="q" className={s.search} type="search" placeholder="Search…" />
        </div>
        <Link className={s.iconBtn} href="/admin/messages" aria-label={`Notifications, ${unread.length} unread`}>
          <PathIcon d={ICON.bell} size={20} />
          {unread.length > 0 && <span className={s.bellDot} />}
        </Link>
        <Link className={`${s.btn} ${s.btnPrimary}`} href="/admin/projects/new">
          <PathIcon d={ICON.plus} sw={2.2} />
          Add project
        </Link>
      </TopBar>

      <div className={`${s.content} ${s.content28}`}>
        <div className={s.kpis}>
          {kpis.map((k) => (
            <Link key={k.label} className={`${s.panel} ${s.kpi} ${s.rise}`} href={k.href}>
              <div className={s.kpiTop}>
                <span className={s.kpiLabel}>{k.label}</span>
                <span className={s.kpiIco}><PathIcon d={k.icon} /></span>
              </div>
              <span className={s.kpiVal}>{k.value}</span>
              <span className={s.kpiCta}>{k.cta} →</span>
            </Link>
          ))}
        </div>

        <div className={s.grid2}>
          <section className={`${s.panel} ${s.rise} ${s.d1} ${s.ov}`} aria-labelledby="att">
            <div className={s.panelHead}>
              <h2 id="att">Needs your attention</h2>
              <Link href="/admin/bookings">All bookings</Link>
            </div>
            {pending.length ? (
              <ul className={s.ul}>
                {pending.map((b) => (
                  <li key={b.id} className={s.attRow}>
                    <Avatar name={b.name} />
                    <div className={s.rowMain} style={{ flexBasis: 180 }}>
                      <span className={s.rowTitle}>{b.name} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· {b.company}</span></span>
                      <span className={s.rowSub}>{b.typeLabel} · <span className={s.monoSm} style={{ fontSize: 13 }}>{fmtDay(b.date)}, {b.time}</span></span>
                    </div>
                    <div className={s.btnRow}>
                      <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href={`/admin/bookings?id=${b.id}`}>Reschedule</Link>
                      <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} onClick={() => confirm(b.id, b.name)}>Confirm</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={s.caught}>
                <span className={s.caughtIco}><PathIcon d={ICON.check} size={22} sw={2.4} /></span>
                <strong style={{ fontSize: 15 }}>All caught up</strong>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>No bookings waiting for confirmation.</span>
              </div>
            )}
          </section>

          <section className={`${s.panel} ${s.rise} ${s.d2} ${s.ov}`} aria-labelledby="up">
            <div className={s.panelHead}>
              <h2 id="up">Next 7 days</h2>
              <span className={s.monoSm}>SAST</span>
            </div>
            <ol className={s.timeline}>
              {upcoming.map((u) => (
                <li key={u.id} className={s.tl}>
                  <span className={s.tlWhen}><span className={s.monoSm}>{fmtDay(u.date).replace(/ [A-Z][a-z]{2}$/, '')}</span><span>{u.time}</span></span>
                  <span aria-hidden="true" className={s.tlLine}><span /><span className={s.tlDot} style={{ background: DOT[u.status], boxShadow: `0 0 0 1px ${DOT[u.status]}` }} /></span>
                  <span className={s.tlBody}>
                    <span>{u.name}</span>
                    <span className={s.tlMeta}>{u.typeLabel}<StatusPill status={u.status} /></span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className={s.grid2}>
          <section className={`${s.panel} ${s.rise} ${s.d3} ${s.ov}`} aria-labelledby="msg">
            <div className={s.panelHead}>
              <h2 id="msg">Latest messages</h2>
              <Link href="/admin/messages">Open inbox</Link>
            </div>
            <ul className={s.ul}>
              {latest.map((m) => (
                <li key={m.id}>
                  <Link className={s.dMsg} href={`/admin/messages?id=${m.id}`}>
                    <span aria-hidden="true" className={`${s.dot} ${m.read ? '' : s.dotOn}`} />
                    <span className={s.msgMain}>
                      <span className={s.msgTop}>
                        <span style={{ fontSize: 15, fontWeight: m.read ? 500 : 600 }}>{m.name} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· {m.company}</span></span>
                        <span className={s.monoSm} style={{ whiteSpace: 'nowrap' }}>{m.when}</span>
                      </span>
                      <span className={s.ellip}>{m.message.replace(/\s+/g, ' ')}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${s.panel} ${s.rise} ${s.d4}`} aria-labelledby="qa" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 id="qa" style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Quick actions</h2>
            <div className={s.qaGrid}>
              <Link className={s.qa} href="/admin/projects/new"><span className={s.qaIco}><PathIcon d={ICON.plus} size={16} sw={2.2} /></span>Add a project</Link>
              <Link className={s.qa} href="/admin/settings?tab=availability"><span className={s.qaIco}><PathIcon d={ICON.bookings} size={16} sw={2} /></span>Edit availability</Link>
              <Link className={s.qa} href="/admin/settings?tab=prices"><span className={s.qaIco}><PathIcon d={ICON.tag} size={16} sw={2} /></span>Update prices</Link>
              <Link className={s.qa} href="/" target="_blank"><span className={s.qaIco}><PathIcon d={ICON.external} size={16} sw={2} /></span>View live website</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
