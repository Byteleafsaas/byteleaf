'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import s from './Select.module.css';

export type SelectOption = string | { value: string; label: string };

type Props = {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Class(es) that style the closed trigger like a text field (`field` on the site, the admin `.field` in the admin). */
  triggerClass: string;
  /** Extra class on the wrapper, for sizing. */
  className?: string;
  /** When set, a hidden input carries the value so the control works in a plain <form>. */
  name?: string;
  disabled?: boolean;
};

const val = (o: SelectOption) => (typeof o === 'string' ? o : o.value);
const lab = (o: SelectOption) => (typeof o === 'string' ? o : o.label);

// Custom listbox so the open list can match our styling (native <option> lists can't be styled).
export default function ListSelect({ id, value, options, onChange, triggerClass, className, name, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => val(o) === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => val(o) === value)));
    setOpen(true);
  };
  const choose = (o: SelectOption) => {
    onChange(val(o));
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    const move = (n: number) => {
      e.preventDefault();
      if (!open) return openList();
      setActive((a) => Math.min(options.length - 1, Math.max(0, a + n)));
    };
    if (e.key === 'ArrowDown') move(1);
    else if (e.key === 'ArrowUp') move(-1);
    else if (e.key === 'Home' && open) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && open) { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) choose(options[active]);
      else openList();
    }
  };

  return (
    <div className={`${s.root} ${className ?? ''}`} ref={root}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        id={id}
        className={`${triggerClass} ${s.trigger}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
      >
        <span>{current ? lab(current) : value}</span>
        <svg className={s.chev} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className={s.list} role="listbox" id={listId} aria-labelledby={id}>
          {options.map((o, i) => (
            <li
              key={val(o)}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={val(o) === value}
              className={`${s.opt} ${i === active ? s.active : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
            >
              {lab(o)}
              {val(o) === value && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
