'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { LogoMark } from '@/components/Logo';
import { useAssistantCounts } from '@/lib/admin/assistant-counts';
import { useAdmin } from '@/lib/admin/store';
import { logoutAction } from '@/lib/server/actions/auth';
import { initials } from '@/lib/admin/format';
import { ICON, PathIcon } from './icons';
import { ToastHost } from './Ui';
import s from './admin.module.css';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: ICON.dashboard },
  { key: 'bookings', label: 'Bookings', href: '/admin/bookings', icon: ICON.bookings },
  { key: 'messages', label: 'Messages', href: '/admin/messages', icon: ICON.messages },
  { key: 'billing', label: 'Quotes & invoices', href: '/admin/billing', icon: ICON.billing },
  { key: 'projects', label: 'Projects', href: '/admin/projects', icon: ICON.projects },
  { key: 'assistant', label: 'Knowledge assistant', href: '/admin/assistant', icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6' },
  { key: 'settings', label: 'Settings', href: '/admin/settings', icon: ICON.settings },
];

// The knowledge assistant has its own sidebar (HANDOFF-CHATBOT §1).
const ASSISTANT_NAV = [
  { key: 'sources', label: 'Knowledge sources', href: '/admin/assistant/sources', icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6' },
  { key: 'review', label: 'Review & publish', href: '/admin/assistant/review', icon: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9' },
  { key: 'test', label: 'Test assistant', href: '/admin/assistant/test', icon: 'M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z' },
  { key: 'unanswered', label: 'Unanswered', href: '/admin/assistant/unanswered', icon: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { key: 'conversations', label: 'Conversations', href: '/admin/assistant/conversations', icon: 'M4 6h16M4 12h16M4 18h10' },
  { key: 'settings', label: 'Assistant settings', href: '/admin/assistant/settings', icon: ICON.settings },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { bookings, messages, user } = useAdmin();
  const counts = useAssistantCounts();
  const inAssistant = pathname.startsWith('/admin/assistant');

  const badges: Record<string, number> = inAssistant ? { review: counts.review, unanswered: counts.unanswered } : {
    bookings: bookings.filter((b) => b.status === 'pending').length,
    messages: messages.filter((m) => !m.read && !m.archived).length,
  };
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  const items = inAssistant ? ASSISTANT_NAV : NAV;

  return (
    <div className={s.shell}>
      <aside className={s.side}>
        <Link href="/admin" className={s.brand} aria-label="byteleaf admin home">
          <LogoMark size={30} />
          <span>byteleaf</span>
          <span className={s.adminPill}>ADMIN</span>
        </Link>
        {inAssistant && (
          <div className={s.wscard}>
            <span className={s.wscardLabel}>KNOWLEDGE ASSISTANT</span>
            <div className={s.wsbtn}>
              <span className={s.wsdot} aria-hidden="true"><PathIcon d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" size={14} /></span>
              <span className={s.wsname}><span>Khumalo Home Solar</span><small>Demo client</small></span>
            </div>
          </div>
        )}
        <nav aria-label={inAssistant ? 'Assistant admin' : 'Admin'} className={s.snavs}>
          {items.map((n) => (
            <Link key={n.key} href={n.href} className={s.snav} aria-current={isActive(n.href) ? 'page' : undefined}>
              <PathIcon d={n.icon} size={20} />
              <span className={s.snavLabel}>{n.label}</span>
              {badges[n.key] > 0 && (
                <span className={s.badge}>
                  {badges[n.key]}
                  <span className={s.sr}> new</span>
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className={s.sfoot}>
          {inAssistant ? (
            <Link className={s.snav} href="/admin">
              <PathIcon d="M19 12H5M11 18l-6-6 6-6" size={20} />
              byteleaf admin
            </Link>
          ) : (
            <Link className={s.snav} href="/" target="_blank">
              <PathIcon d={ICON.external} size={20} />
              View website
            </Link>
          )}
          <div className={s.user}>
            <span className={s.avatarSm} aria-hidden="true">{initials(user.name) || 'A'}</span>
            <span className={s.userText}>
              <span className={s.userName}>{user.name}</span>
              <span className={s.userRole}>Administrator</span>
            </span>
            <button type="button" className={s.signout} aria-label="Sign out" onClick={async () => { await logoutAction(); router.push('/admin/login'); router.refresh(); }}>
              <PathIcon d={ICON.signout} />
            </button>
          </div>
        </div>
      </aside>
      <main className={s.main}>{children}</main>
      <ToastHost />
    </div>
  );
}
