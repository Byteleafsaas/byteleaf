'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { LogoMark } from '@/components/Logo';
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
  { key: 'settings', label: 'Settings', href: '/admin/settings', icon: ICON.settings },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { bookings, messages, user } = useAdmin();

  const badges: Record<string, number> = {
    bookings: bookings.filter((b) => b.status === 'pending').length,
    messages: messages.filter((m) => !m.read && !m.archived).length,
  };
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <div className={s.shell}>
      <aside className={s.side}>
        <Link href="/admin" className={s.brand} aria-label="byteleaf admin home">
          <LogoMark size={30} />
          <span>byteleaf</span>
          <span className={s.adminPill}>ADMIN</span>
        </Link>
        <nav aria-label="Admin" className={s.snavs}>
          {NAV.map((n) => (
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
          <Link className={s.snav} href="/" target="_blank">
            <PathIcon d={ICON.external} size={20} />
            View website
          </Link>
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
