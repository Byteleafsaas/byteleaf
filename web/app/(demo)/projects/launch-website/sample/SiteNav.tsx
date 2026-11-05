'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { siteHref } from '@/lib/launch/site';
import s from './site.module.css';

const LINKS = [
  { path: 'services', label: 'Services' },
  { path: 'about', label: 'About' },
  { path: 'gallery', label: 'Gallery' },
  { path: 'contact', label: 'Contact' },
] as const;

/** The header navigation: links across, and on a phone a Call button and a Menu that opens a list of big rows. */
export default function SiteNav({ tel }: { tel: string | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const cur = (p: '' | 'services' | 'about' | 'gallery' | 'contact') => (path === siteHref(p) ? 'page' : undefined);
  return (
    <>
      <nav className={s.dnav} aria-label="Main">
        {LINKS.map((l) => <Link key={l.path} href={siteHref(l.path)} className={s.nl} aria-current={cur(l.path)}>{l.label}</Link>)}
        <Link href={siteHref('contact')} className={`${s.b} ${s.bSun}`} style={{ minHeight: 46, marginLeft: 10 }}>Book a wash</Link>
      </nav>
      <div className={s.mnav}>
        {tel ? (
          <a className={`${s.b} ${s.bLine}`} href={tel} aria-label="Call us" style={{ minHeight: 44, width: 44, padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
          </a>
        ) : null}
        <button type="button" className={`${s.b} ${s.bLine}`} aria-expanded={open} aria-controls="mmenu" onClick={() => setOpen(!open)} style={{ minHeight: 44, padding: '0 14px', fontSize: 15 }}>Menu</button>
      </div>
      {open && (
        <nav id="mmenu" aria-label="Main" className={s.mpanel} style={{ position: 'absolute', left: 0, right: 0, top: '100%' }}>
          <Link href={siteHref('')} className={s.nl} aria-current={cur('')}>Home</Link>
          {LINKS.map((l) => <Link key={l.path} href={siteHref(l.path)} className={s.nl} aria-current={cur(l.path)}>{l.label}</Link>)}
        </nav>
      )}
    </>
  );
}
