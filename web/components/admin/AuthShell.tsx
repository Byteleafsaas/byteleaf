import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoMark } from '@/components/Logo';
import a from './auth.module.css';

export default function AuthShell({ heading, text, children }: { heading: string; text: string; children: ReactNode }) {
  return (
    <div className={a.wrap}>
      <section className={a.brand} aria-label="byteleaf">
        <div className={a.dots} aria-hidden="true" />
        <div className={a.glow} aria-hidden="true" />
        <Link href="/" className={a.logo}>
          <LogoMark size={32} />
          <span>byteleaf</span>
          <span className={a.pill}>ADMIN</span>
        </Link>
        <div className={a.art} aria-hidden="true">
          <svg className={a.ring} width="380" height="380" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" fill="none" stroke="#1C2B47" strokeWidth="1" />
            <circle cx="100" cy="100" r="92" fill="none" stroke="#1877F2" strokeWidth="1" strokeDasharray="2 8" />
            <circle cx="100" cy="100" r="64" fill="none" stroke="#1C2B47" strokeWidth="1" />
          </svg>
          <div className={a.mark}>
            <svg width="84" height="84" viewBox="0 0 32 32">
              <path d="M6 26C6 14 14 6 26 6C26 18 18 26 6 26Z" fill="#FFFFFF" />
              <path d="M6.5 25.5L19 13M12 20h5M15 17v-4" stroke="#1877F2" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>
        <div className={a.copy}>
          <h2>{heading}</h2>
          <p>{text}</p>
        </div>
      </section>
      <section className={a.formSide}>
        <div className={a.col}>{children}</div>
      </section>
    </div>
  );
}
