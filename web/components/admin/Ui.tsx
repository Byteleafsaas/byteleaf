'use client';

import type { ReactNode } from 'react';
import { useAdmin } from '@/lib/admin/store';
import { initials } from '@/lib/admin/format';
import { ICON, PathIcon, SearchIcon } from './icons';
import s from './admin.module.css';

export function TopBar({ crumb, title, children }: { crumb: string; title: string; children?: ReactNode }) {
  return (
    <header className={s.topbar}>
      <div className={s.titleBox}>
        <span className={s.crumb}>{crumb}</span>
        <h1 className={s.h1}>{title}</h1>
      </div>
      {children && <div className={s.actions}>{children}</div>}
    </header>
  );
}

export function SearchBox({ id = 'q', label, placeholder, value, onChange }: { id?: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={s.searchWrap}>
      <label htmlFor={id} className={s.sr}>{label}</label>
      <SearchIcon />
      <input id={id} className={s.search} type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export type TabDef<K extends string> = { key: K; label: string; count: number };

export function PillTabs<K extends string>({ label, tabs, value, onChange }: { label: string; tabs: TabDef<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <div role="tablist" aria-label={label} className={s.tabs}>
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" className={s.tab} aria-selected={t.key === value} onClick={() => onChange(t.key)}>
          {t.label}
          <span className={s.count}>{t.count}</span>
        </button>
      ))}
    </div>
  );
}

export function StatusPill({ status, children }: { status: string; children?: ReactNode }) {
  const label = children ?? status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`${s.pill} ${s[`s-${status}`] ?? ''}`}>{label}</span>;
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  return <span aria-hidden="true" className={`${s.avatar} ${large ? s.avatarLg : ''}`}>{initials(name)}</span>;
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={s.switch} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function ToastHost() {
  const { toast, dismissToast } = useAdmin();
  if (!toast) return null;
  return (
    <div role="status" className={s.toast} key={toast.id}>
      <span className={s.toastIcon}><PathIcon d={ICON.check} size={14} sw={3} stroke="#fff" /></span>
      <span>{toast.text}</span>
      {toast.undo && (
        <button type="button" className={s.toastUndo} onClick={() => { toast.undo?.(); dismissToast(); }}>Undo</button>
      )}
      <button type="button" className={s.toastX} aria-label="Dismiss" onClick={dismissToast}>
        <PathIcon d={ICON.close} size={14} sw={2.4} />
      </button>
    </div>
  );
}
