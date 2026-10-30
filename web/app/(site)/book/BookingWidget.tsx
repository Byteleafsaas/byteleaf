'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowIcon, ChevronLeft, ChevronRight } from '@/components/Icon';
import type { AvailabilityMap } from '@/lib/availability';
import type { MeetingTypeKey } from '@/lib/admin/types';
import { MEETING_TYPES } from '@/lib/content';
import { submitBookingAction } from '@/lib/server/actions/public';
import s from './book.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Ymd = { y: number; m: number; d: number };
type TypeInfo = { key: MeetingTypeKey; name: string; where: string; minutes: number };

const parse = (k: string): Ymd => {
  const [y, m, d] = k.split('-').map(Number);
  return { y, m: m - 1, d };
};
const keyOf = ({ y, m, d }: Ymd) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const weekday = (v: Ymd) => new Date(Date.UTC(v.y, v.m, v.d)).getUTCDay();
const label = (v: Ymd) => `${DAYS[weekday(v)]} ${v.d} ${MONTHS[v.m]}`;

/**
 * Availability (which days/times can be booked) comes from the server and follows Settings › Availability:
 * working days, start times, blocked dates, notice, breaks, and slots already taken. The server re-checks on submit.
 */
export default function BookingWidget({ availability, types }: { availability: AvailabilityMap; types: TypeInfo[] }) {
  const router = useRouter();
  const [type, setType] = useState(0);
  const firstDate = Object.keys(availability).sort()[0];
  const [view, setView] = useState(() => {
    const f = parse(firstDate ?? new Date().toISOString().slice(0, 10));
    return { y: f.y, m: f.m };
  });
  const [day, setDay] = useState<Ymd | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const t = types[type];
  const first = parse(firstDate ?? keyOf({ y: view.y, m: view.m, d: 1 }));
  const atStart = view.y < first.y || (view.y === first.y && view.m <= first.m);
  const freeFor = (v: Ymd) => (t ? availability[keyOf(v)]?.[t.key] ?? [] : []);
  const slots = day ? freeFor(day) : [];

  const shift = (n: number) => {
    const d = new Date(Date.UTC(view.y, view.m + n, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };
  const offset = (weekday({ ...view, d: 1 }) + 6) % 7;
  const daysIn = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const dateLabel = day ? label(day) : '—';
  const meta = (key: MeetingTypeKey) => MEETING_TYPES.find((m) => m.key === key);

  const pickType = (i: number) => {
    setType(i);
    setDay(null);
    setTime(null);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!day || !time || !t) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    const r = await submitBookingAction({
      meetingType: t.key, date: keyOf(day), time,
      name: String(fd.get('name') ?? ''), email: String(fd.get('email') ?? ''), company: String(fd.get('company') ?? ''), note: String(fd.get('notes') ?? ''),
      trap: String(fd.get('trap') ?? ''),
    });
    setBusy(false);
    if (r.ok) return setDone(true);
    setError(r.error);
    setTime(null);
    router.refresh(); // the slot may have been taken: reload availability
  };

  if (!t) {
    return (
      <div className={s.done} role="status">
        <h2>Booking isn&apos;t available right now.</h2>
        <p>Please send us a message instead and we&apos;ll find a time together.</p>
        <div className={s.doneBtns}><Link className="btn btn-primary btn-lg" href="/contact">Send a message</Link></div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={`slide ${s.done}`} role="status">
        <span className={`popin ${s.doneDisc}`}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path className="draw" d="M5 12l5 5L20 7" />
          </svg>
        </span>
        <h2>You&apos;re booked in.</h2>
        <p>{t.name} · {dateLabel} at {time} SAST. We&apos;ll confirm by email shortly, with a calendar invite and the meeting link.</p>
        <div className={s.doneBtns}>
          <Link className="btn btn-primary btn-lg" href="/">Back to home</Link>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => { setDone(false); setDay(null); setTime(null); router.refresh(); }}>Book another</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rise d3 ${s.row}`}>
      <div className={s.left}>
        <div className={s.box}>
          <span className={s.label}>1 · MEETING TYPE</span>
          {types.map((x, i) => (
            <button key={x.key} type="button" className={s.opt} aria-pressed={i === type} onClick={() => pickType(i)}>
              <span className={s.radio} />
              <span className={s.optText}>
                <span className={s.optName}>{x.name}</span>
                <span className={s.optDesc}>{meta(x.key)?.text}</span>
                <span className={s.optMeta}>{x.minutes} min · {x.where}</span>
              </span>
            </button>
          ))}
        </div>
        <div className={s.summary}>
          <span className={s.label}>YOUR BOOKING</span>
          <div className={s.sumRows}>
            <div className={s.sumRow}><span>Meeting</span><span>{t.name}</span></div>
            <div className={s.sumRow}><span>Date</span><span>{dateLabel}</span></div>
            <div className={s.sumRow}><span>Time</span><span>{time ? `${time} SAST` : '—'}</span></div>
            <div className={s.sumRow}><span>Where</span><span>{t.where}</span></div>
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.pick}>
          <div className={s.cal}>
            <div className={s.calHead}>
              <span className={s.label}>2 · DATE</span>
              <div className={s.nav}>
                <button type="button" className={s.iconBtn} onClick={() => !atStart && shift(-1)} disabled={atStart} aria-label="Previous month"><ChevronLeft /></button>
                <span className={s.month}>{MONTHS[view.m]} {view.y}</span>
                <button type="button" className={s.iconBtn} onClick={() => shift(1)} aria-label="Next month"><ChevronRight /></button>
              </div>
            </div>
            <div className={s.dow}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d}>{d}</span>)}</div>
            <div className={s.days}>
              {Array.from({ length: offset }, (_, i) => <span key={`b${i}`} className={s.blank} />)}
              {Array.from({ length: daysIn }, (_, i) => {
                const v: Ymd = { y: view.y, m: view.m, d: i + 1 };
                const off = freeFor(v).length === 0;
                const sel = !!day && keyOf(day) === keyOf(v);
                return (
                  <button key={v.d} type="button" className={s.day} disabled={off} aria-pressed={sel} aria-label={label(v)} onClick={() => { setDay(v); setTime(null); }}>
                    {v.d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={s.times}>
            <span className={s.label}>3 · TIME (SAST)</span>
            {day ? (
              <div className={`slide ${s.slots}`}>
                {slots.map((x) => (
                  <button key={x} type="button" className={s.slot} aria-pressed={x === time} onClick={() => setTime(x)}>{x}</button>
                ))}
              </div>
            ) : (
              <div className={s.empty}>Pick a weekday to see available times.</div>
            )}
          </div>
        </div>

        <form onSubmit={submit} className={s.details}>
          <span className={s.label}>4 · YOUR DETAILS</span>
          <input type="text" name="trap" tabIndex={-1} autoComplete="new-password" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
          <div className={s.dgrid}>
            <div className="fgroup"><label htmlFor="b-name">Name</label><input id="b-name" name="name" className="field" type="text" placeholder="Your name" required autoComplete="name" /></div>
            <div className="fgroup"><label htmlFor="b-email">Work email</label><input id="b-email" name="email" className="field" type="email" placeholder="you@company.co.za" required autoComplete="email" /></div>
            <div className="fgroup"><label htmlFor="b-co">Company</label><input id="b-co" name="company" className="field" type="text" placeholder="Company name" autoComplete="organization" /></div>
          </div>
          <div className="fgroup"><label htmlFor="b-notes">Anything we should know beforehand?</label>
            <textarea id="b-notes" name="notes" className={`field ${s.area}`} rows={3} placeholder="Systems you use, what's not working, links…" /></div>
          {error && <p role="alert" style={{ margin: 0, color: '#B42318', fontSize: 14 }}>{error}</p>}
          <div className={s.foot}>
            <span className={s.hint}>{day && time ? 'Looks good — just add your details.' : 'Choose a date and time to continue.'}</span>
            <button type="submit" className="btn btn-primary btn-lg" disabled={!(day && time) || busy}>
              {busy ? 'Booking…' : 'Confirm booking'}
              <ArrowIcon />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
