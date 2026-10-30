'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV } from '@/lib/content';
import { Logo } from './Logo';
import { ArrowIcon, CloseIcon, MenuIcon } from './Icon';

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const onBook = pathname === '/book';

  return (
    <header className="header">
      <nav aria-label="Main" className="header-in">
        <Logo />
        <div className="dnav">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="navlink" aria-current={pathname === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </div>
        <Link href="/book" className="btn btn-primary btn-sm dcta" aria-current={onBook ? 'page' : undefined}>
          Book a call
          {!onBook && <ArrowIcon size={16} />}
        </Link>
        <div className="mnav" data-open={open}>
          <button type="button" className="menu-btn" aria-label="Menu" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
            <MenuIcon className="i-open" />
            <CloseIcon className="i-close" />
          </button>
          {open && (
            <div className="mpanel" id="mobile-menu">
              {NAV.map((l) => (
                <Link key={l.href} href={l.href} className="mlink" aria-current={pathname === l.href ? 'page' : undefined}>
                  {l.label}
                </Link>
              ))}
              <Link href="/book" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 12 }}>
                Book a call
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
