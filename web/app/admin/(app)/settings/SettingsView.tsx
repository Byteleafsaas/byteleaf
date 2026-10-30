'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';
import { PathIcon } from '@/components/admin/icons';
import { Switch, TopBar } from '@/components/admin/Ui';
import s from '@/components/admin/admin.module.css';
import t from '@/components/admin/settings.module.css';
import { fmtShort, todayKey } from '@/lib/admin/format';
import { useAdmin } from '@/lib/admin/store';
import TwoStepCard from './TwoStepCard';
import { signOutOthersAction } from '@/lib/server/actions/auth';
import { saveSettingsAction } from '@/lib/server/actions/settings';
import type { Settings } from '@/lib/admin/types';

type Tab = 'business' | 'prices' | 'availability' | 'invoicing' | 'account';
const TABS: [Tab, string, string][] = [
  ['business', 'Business details', 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4'],
  ['prices', 'Prices', 'M20 12l-8 8-9-9V3h8zM7.5 7.5h.01'],
  ['availability', 'Availability', 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4'],
  ['invoicing', 'Invoicing', 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4'],
  ['account', 'Account & security', 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const X = 'M6 6l12 12M18 6L6 18';

export default function SettingsView() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Field({ id, label, hint, className, children }: { id: string; label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`${s.fg} ${className ?? ''}`}>
      <label htmlFor={id} className={s.label}>{label}</label>
      {children}
      {hint && <span className={t.hint}>{hint}</span>}
    </div>
  );
}

function Select({ id, value, options, onChange, className }: { id: string; value: string; options: string[]; onChange: (v: string) => void; className?: string }) {
  const opts = options.includes(value) ? options : [value, ...options];
  return (
    <select id={id} className={`${s.field} ${className ?? ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function Inner() {
  const { settings, setSettings, notify, refresh } = useAdmin();
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const p = params.get('tab') as Tab | null;
  const tab: Tab = TABS.some((x) => x[0] === p) ? (p as Tab) : 'availability';

  const [d, setD] = useState<Settings>(() => structuredClone(settings));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [newSlot, setNewSlot] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [range, setRange] = useState({ from: '', to: '' });

  const upd = (fn: (n: Settings) => void) =>
    setD((o) => {
      const n = structuredClone(o);
      fn(n);
      return n;
    });

  const validate = () => {
    const e: Record<string, string> = {};
    const { business: b, availability: a, invoicing: i, account: ac } = d;
    if (b.publicEmail && !EMAIL.test(b.publicEmail)) e.publicEmail = 'Enter a valid email address.';
    if (b.notifyEmail && !EMAIL.test(b.notifyEmail)) e.notifyEmail = 'Enter a valid email address.';
    if (ac.email && !EMAIL.test(ac.email)) e.accEmail = 'Enter a valid email address.';
    if (!a.workingDays.length) e.days = 'Pick at least one working day.';
    if (!a.startTimes.length) e.slots = 'Add at least one start time.';
    if (!(a.maxPerDay >= 1)) e.max = 'Must be at least 1.';
    if (!/^Q-\d{4}-\d{3,}$/.test(i.nextQuoteNo)) e.nq = 'Use the format Q-2026-001.';
    if (!/^INV-\d{4}-\d{3,}$/.test(i.nextInvoiceNo)) e.ni = 'Use the format INV-2026-001.';
    if (i.vatRegistered && !i.vatNumber.trim()) e.vat = 'Add your VAT number to charge VAT.';
    return e;
  };

  const save = async () => {
    const e = validate();
    setErrs(e);
    const keys = Object.keys(e);
    if (keys.length) {
      // jump to the tab that holds the first error
      const map: Record<string, Tab> = { publicEmail: 'business', notifyEmail: 'business', accEmail: 'account', days: 'availability', slots: 'availability', max: 'availability', nq: 'invoicing', ni: 'invoicing', vat: 'invoicing' };
      router.replace(`/admin/settings?tab=${map[keys[0]]}`);
      notify('Fix the highlighted fields, then save again.');
      return;
    }
    setSaving(true);
    const r = await saveSettingsAction(d);
    setSaving(false);
    if (!r.ok) return notify(r.error);
    setSettings(structuredClone(d));
    notify('Settings saved.');
    refresh();
  };

  const { business: b, prices: pr, availability: av, invoicing: iv, account: ac } = d;
  const MIN = todayKey();

  return (
    <>
      <TopBar crumb="Admin / Settings" title="Settings">
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </TopBar>

      <div className={t.wrap}>
        <nav aria-label="Settings sections" className={t.tabs}>
          {TABS.map(([k, label, icon]) => (
            <button key={k} type="button" className={t.stab} aria-current={tab === k ? 'page' : undefined} onClick={() => router.replace(`/admin/settings?tab=${k}`)}>
              <PathIcon d={icon} />
              {label}
            </button>
          ))}
        </nav>

        <div className={t.main}>
          {tab === 'business' && (
            <section className={`${s.panel} ${t.sec}`} aria-labelledby="h-biz">
              <div className={t.secHead}><h2 id="h-biz">Business details</h2><span className={t.hint}>Shown on the Contact page and in the website footer.</span></div>
              <div className={t.grid}>
                <Field id="b-email" label="Public email"><input id="b-email" className={s.field} type="email" placeholder="hello@yourdomain.co.za" value={b.publicEmail} aria-invalid={!!errs.publicEmail} onChange={(e) => upd((n) => { n.business.publicEmail = e.target.value; })} />{errs.publicEmail && <span className={t.err} role="alert">{errs.publicEmail}</span>}</Field>
                <Field id="b-phone" label="Phone / WhatsApp"><input id="b-phone" className={s.field} type="tel" placeholder="+27 00 000 0000" value={b.phone} onChange={(e) => upd((n) => { n.business.phone = e.target.value; })} /></Field>
                <Field id="b-addr" label="Studio location"><input id="b-addr" className={s.field} type="text" value={b.location} onChange={(e) => upd((n) => { n.business.location = e.target.value; })} /></Field>
                <Field id="b-hours" label="Office hours"><input id="b-hours" className={s.field} type="text" placeholder="Mon–Fri · 08:00–17:00 SAST" value={b.hours} onChange={(e) => upd((n) => { n.business.hours = e.target.value; })} /></Field>
                <Field id="b-reply" label="We reply within"><Select id="b-reply" value={b.replyWithin} options={['4 business hours', '8 business hours', '1 business day', '2 business days']} onChange={(v) => upd((n) => { n.business.replyWithin = v; })} /></Field>
                <Field id="b-urgent" label="Urgent response time (care contracts)"><Select id="b-urgent" value={b.urgentResponse} options={['2 hours', '4 hours', '8 hours']} onChange={(v) => upd((n) => { n.business.urgentResponse = v; })} /></Field>
              </div>
              <Field id="b-notify" label="Send new bookings & messages to" hint="You'll get an email the moment someone books or writes in."><input id="b-notify" className={s.field} type="email" placeholder="you@byteleaf.co.za" value={b.notifyEmail} aria-invalid={!!errs.notifyEmail} onChange={(e) => upd((n) => { n.business.notifyEmail = e.target.value; })} />{errs.notifyEmail && <span className={t.err} role="alert">{errs.notifyEmail}</span>}</Field>
            </section>
          )}

          {tab === 'prices' && (
            <section className={`${s.panel} ${t.sec}`} aria-labelledby="h-price">
              <div className={t.secHead}><h2 id="h-price">Prices</h2><span className={t.hint}>Shown on the Services page under &quot;Ways to work with us&quot;. Leave blank to show &quot;Let&apos;s talk&quot;.</span></div>
              {([['care', 'CARE', 'Maintenance contract', 'e.g. From R 0 000'], ['build', 'BUILD', 'Full-stack projects', 'e.g. Quoted per project'], ['fix', 'FIX', 'Bug fixing & rescue', 'e.g. R 000'], ['team', 'TEAM', 'Embedded collaboration', "Let's talk"]] as const).map(([k, tag, title, ph]) => (
                <div key={k} className={t.priceRow}>
                  <div className={s.col} style={{ gap: 4 }}><span className={t.priceTag}>{tag}</span><span className={t.priceTitle}>{title}</span></div>
                  <Field id={`pr-${k}`} label="Price shown"><input id={`pr-${k}`} className={s.field} type="text" placeholder={ph} value={pr[k].text} onChange={(e) => upd((n) => { n.prices[k].text = e.target.value; })} /></Field>
                  <Field id={`pr-${k}-u`} label="Billing"><Select id={`pr-${k}-u`} value={pr[k].unit} options={['Per month', 'Per project', 'Per hour', 'Custom quote']} onChange={(v) => upd((n) => { n.prices[k].unit = v; })} /></Field>
                </div>
              ))}
              <Field id="pr-hrs" label="Hours of changes included in a care contract" className={t.narrow}><input id="pr-hrs" className={s.field} type="number" min={0} placeholder="e.g. 8" value={pr.includedHours} onChange={(e) => upd((n) => { n.prices.includedHours = e.target.value; })} /></Field>
            </section>
          )}

          {tab === 'availability' && (
            <section className={`${s.panel} ${t.sec} ${t.sec22}`} aria-labelledby="h-av">
              <div className={t.secHead}><h2 id="h-av">Booking availability</h2><span className={t.hint}>Controls what visitors can pick on the Book a call page. All times SAST.</span></div>

              <fieldset className={t.fieldset}>
                <legend className={`${s.label} ${t.legend}`}>Working days</legend>
                <div className={t.days}>
                  {DAY_NAMES.map((name, i) => {
                    const n = i + 1;
                    const on = av.workingDays.includes(n);
                    return <button key={name} type="button" className={t.day} aria-pressed={on} onClick={() => upd((x) => { x.availability.workingDays = on ? x.availability.workingDays.filter((y) => y !== n) : [...x.availability.workingDays, n].sort(); })}>{name}</button>;
                  })}
                </div>
                {errs.days && <span className={t.err} role="alert">{errs.days}</span>}
              </fieldset>

              <div className={s.fg} style={{ gap: 10 }}>
                <span className={s.label} id="slots-l">Start times</span>
                <div role="group" aria-labelledby="slots-l" className={t.slotRow}>
                  {[...av.startTimes].sort().map((time) => (
                    <span key={time} className={t.slot}>
                      {time}
                      <button type="button" className={t.slotx} aria-label={`Remove ${time}`} onClick={() => upd((x) => { x.availability.startTimes = x.availability.startTimes.filter((y) => y !== time); })}>
                        <PathIcon d={X} size={12} sw={2.6} />
                      </button>
                    </span>
                  ))}
                  <label htmlFor="new-slot" className={s.sr}>Add a start time</label>
                  <input id="new-slot" className={`${s.field} ${t.time}`} type="time" step={900} value={newSlot} onChange={(e) => {
                    const v = e.target.value;
                    if (v && !av.startTimes.includes(v)) upd((x) => { x.availability.startTimes.push(v); });
                    setNewSlot('');
                  }} />
                </div>
                {errs.slots && <span className={t.err} role="alert">{errs.slots}</span>}
              </div>

              <div className={s.fg} style={{ gap: 10 }}>
                <span className={s.label}>Meeting types</span>
                {av.meetingTypes.map((m, i) => (
                  <div key={m.key} className={t.mt}>
                    <Switch checked={m.enabled} label={`Offer ${m.name}`} onChange={(v) => upd((x) => { x.availability.meetingTypes[i].enabled = v; })} />
                    <span className={t.mtText}><span style={{ color: m.enabled ? 'var(--ink)' : 'var(--muted)' }}>{m.name}</span><span className={t.hint}>{m.where}</span></span>
                    <label htmlFor={`mt-${m.key}`} className={s.sr}>{m.name} length</label>
                    <select id={`mt-${m.key}`} className={`${s.field} ${t.mtLen}`} value={m.minutes} onChange={(e) => upd((x) => { x.availability.meetingTypes[i].minutes = Number(e.target.value); })}>
                      {[15, 30, 45, 60, 90].map((n) => <option key={n} value={n}>{n} min</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className={`${t.grid} ${t.grid220}`}>
                <Field id="av-notice" label="Minimum notice"><Select id="av-notice" value={av.minNotice} options={['Next working day', '24 hours', '48 hours', '1 week']} onChange={(v) => upd((x) => { x.availability.minNotice = v; })} /></Field>
                <Field id="av-buf" label="Break between meetings"><Select id="av-buf" value={av.bufferMin} options={['15 min', 'None', '30 min', '60 min']} onChange={(v) => upd((x) => { x.availability.bufferMin = v; })} /></Field>
                <Field id="av-max" label="Max meetings per day"><input id="av-max" className={s.field} type="number" min={1} value={av.maxPerDay} aria-invalid={!!errs.max} onChange={(e) => upd((x) => { x.availability.maxPerDay = Number(e.target.value); })} />{errs.max && <span className={t.err} role="alert">{errs.max}</span>}</Field>
              </div>

              <div className={s.fg} style={{ gap: 10 }}>
                <span className={s.label}>Blocked dates</span>
                <div className={t.block}>
                  {av.blocked.map((r, i) => {
                    const label = r.from === r.to ? fmtShort(r.from) : `${fmtShort(r.from)} – ${fmtShort(r.to)}`;
                    return (
                      <span key={`${r.from}-${r.to}`} className={t.slot}>
                        {label}
                        <button type="button" className={t.slotx} aria-label={`Remove ${label}`} onClick={() => upd((x) => { x.availability.blocked.splice(i, 1); })}>
                          <PathIcon d={X} size={12} sw={2.6} />
                        </button>
                      </span>
                    );
                  })}
                  {!blocking && <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ minHeight: 40 }} onClick={() => setBlocking(true)}>+ Block dates</button>}
                </div>
                {blocking && (
                  <div className={t.blockForm}>
                    <div className={s.fg}><label htmlFor="bl-from" className={s.label}>From</label><input id="bl-from" className={s.field} type="date" min={MIN} value={range.from} onChange={(e) => setRange((r) => ({ from: e.target.value, to: r.to && r.to < e.target.value ? e.target.value : r.to }))} /></div>
                    <div className={s.fg}><label htmlFor="bl-to" className={s.label}>To</label><input id="bl-to" className={s.field} type="date" min={range.from || MIN} value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></div>
                    <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={!range.from} onClick={() => { upd((x) => { x.availability.blocked.push({ from: range.from, to: range.to || range.from }); }); setRange({ from: '', to: '' }); setBlocking(false); }}>Add</button>
                    <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => { setBlocking(false); setRange({ from: '', to: '' }); }}>Cancel</button>
                  </div>
                )}
                <span className={t.hint}>Public holidays and leave — visitors can&apos;t book on these days.</span>
              </div>
            </section>
          )}

          {tab === 'invoicing' && (
            <section className={`${s.panel} ${t.sec} ${t.sec20}`} aria-labelledby="h-inv">
              <div className={t.secHead}><h2 id="h-inv">Invoicing</h2><span className={t.hint}>Printed on every quote and invoice PDF.</span></div>
              <div className={t.grid}>
                <Field id="i-legal" label="Registered business name"><input id="i-legal" className={s.field} type="text" placeholder="byteleaf (Pty) Ltd" value={iv.legalName} onChange={(e) => upd((n) => { n.invoicing.legalName = e.target.value; })} /></Field>
                <Field id="i-reg" label="Company registration number"><input id="i-reg" className={s.field} type="text" placeholder="0000/000000/07" value={iv.regNo} onChange={(e) => upd((n) => { n.invoicing.regNo = e.target.value; })} /></Field>
                <Field id="i-addr" label="Billing address" className={t.full}><input id="i-addr" className={s.field} type="text" placeholder="Street, suburb, Johannesburg, postal code" value={iv.address} onChange={(e) => upd((n) => { n.invoicing.address = e.target.value; })} /></Field>
              </div>
              <div className={t.card}>
                <div className={t.cardRow}>
                  <span className={t.cardText}><span id="vat-s">VAT registered</span><span className={t.hint}>Adds VAT at 15% and titles invoices &quot;Tax invoice&quot;.</span></span>
                  <button type="button" role="switch" aria-checked={iv.vatRegistered} aria-labelledby="vat-s" className={s.switch} onClick={() => upd((n) => { n.invoicing.vatRegistered = !n.invoicing.vatRegistered; })}><span /></button>
                </div>
                <Field id="i-vat" label="VAT number" className={t.narrow} ><input id="i-vat" className={s.field} type="text" placeholder="4000000000" style={{ maxWidth: 280 }} value={iv.vatNumber} aria-invalid={!!errs.vat} onChange={(e) => upd((n) => { n.invoicing.vatNumber = e.target.value; })} />{errs.vat && <span className={t.err} role="alert">{errs.vat}</span>}</Field>
              </div>
              <fieldset className={`${t.fieldset} ${t.grid} ${t.grid200}`} style={{ display: 'grid' }}>
                <legend className={`${s.label} ${t.legend}`} style={{ marginBottom: 12 }}>Bank details</legend>
                <Field id="i-bank" label="Bank"><input id="i-bank" className={s.field} type="text" placeholder="Bank name" value={iv.bank.name} onChange={(e) => upd((n) => { n.invoicing.bank.name = e.target.value; })} /></Field>
                <Field id="i-accn" label="Account name"><input id="i-accn" className={s.field} type="text" placeholder="byteleaf" value={iv.bank.accountName} onChange={(e) => upd((n) => { n.invoicing.bank.accountName = e.target.value; })} /></Field>
                <Field id="i-acc" label="Account number"><input id="i-acc" className={s.field} type="text" inputMode="numeric" placeholder="Account number" value={iv.bank.accountNo} onChange={(e) => upd((n) => { n.invoicing.bank.accountNo = e.target.value; })} /></Field>
                <Field id="i-br" label="Branch code"><input id="i-br" className={s.field} type="text" inputMode="numeric" placeholder="Branch code" value={iv.bank.branchCode} onChange={(e) => upd((n) => { n.invoicing.bank.branchCode = e.target.value; })} /></Field>
              </fieldset>
              <div className={`${t.grid} ${t.grid200}`}>
                <Field id="i-qp" label="Quote numbers" hint="Next number to use"><input id="i-qp" className={`${s.field} ${t.mono}`} type="text" value={iv.nextQuoteNo} aria-invalid={!!errs.nq} onChange={(e) => upd((n) => { n.invoicing.nextQuoteNo = e.target.value; })} />{errs.nq && <span className={t.err} role="alert">{errs.nq}</span>}</Field>
                <Field id="i-ip" label="Invoice numbers" hint="Next number to use"><input id="i-ip" className={`${s.field} ${t.mono}`} type="text" value={iv.nextInvoiceNo} aria-invalid={!!errs.ni} onChange={(e) => upd((n) => { n.invoicing.nextInvoiceNo = e.target.value; })} />{errs.ni && <span className={t.err} role="alert">{errs.ni}</span>}</Field>
                <Field id="i-terms" label="Default payment terms"><Select id="i-terms" value={iv.defaultTermsDays} options={['14 days', '7 days', '30 days', 'On receipt']} onChange={(v) => upd((n) => { n.invoicing.defaultTermsDays = v; })} /></Field>
                <Field id="i-valid" label="Quotes valid for"><Select id="i-valid" value={iv.quoteValidDays} options={['30 days', '14 days', '60 days']} onChange={(v) => upd((n) => { n.invoicing.quoteValidDays = v; })} /></Field>
                <Field id="i-dep" label="Default quote deposit"><Select id="i-dep" value={iv.defaultDepositPct} options={['50%', '30%', 'None']} onChange={(v) => upd((n) => { n.invoicing.defaultDepositPct = v; })} /></Field>
              </div>
              <Field id="i-foot" label="Default notes on invoices"><textarea id="i-foot" className={`${s.field} ${s.area}`} rows={3} value={iv.defaultInvoiceNotes} onChange={(e) => upd((n) => { n.invoicing.defaultInvoiceNotes = e.target.value; })} /></Field>
            </section>
          )}

          {tab === 'account' && (
            <section className={`${s.panel} ${t.sec}`} aria-labelledby="h-acc">
              <div className={t.secHead}><h2 id="h-acc">Your account</h2><span className={t.hint}>Signed in as administrator.</span></div>
              <div className={t.grid}>
                <Field id="a-name" label="Name"><input id="a-name" className={s.field} type="text" value={ac.name} onChange={(e) => upd((n) => { n.account.name = e.target.value; })} /></Field>
                <Field id="a-email" label="Sign-in email"><input id="a-email" className={s.field} type="email" placeholder="you@byteleaf.co.za" value={ac.email} aria-invalid={!!errs.accEmail} onChange={(e) => upd((n) => { n.account.email = e.target.value; })} />{errs.accEmail && <span className={t.err} role="alert">{errs.accEmail}</span>}</Field>
              </div>
              <div className={`${t.card} ${t.cardRow}`} style={{ flexDirection: 'row' }}>
                <span className={t.cardText}><span>Password</span><span className={t.hint}>Use a long, unique password.</span></span>
                <Link className={`${s.btn} ${s.btnGhost}`} href="/admin/reset-password">Change password</Link>
              </div>
              <TwoStepCard enabled={settings.account.twoStep} />
              <div className={`${t.card} ${t.cardRow}`} style={{ flexDirection: 'row' }}>
                <span className={t.cardText}><span>Sign out everywhere</span><span className={t.hint}>Ends every session except this one.</span></span>
                <button type="button" className={`${s.btn} ${s.btnGhost} ${t.dangerBtn}`} onClick={async () => {
                  const r = await signOutOthersAction();
                  notify(r.count ? `Signed out of ${r.count} other ${r.count === 1 ? 'device' : 'devices'}.` : 'No other devices were signed in.');
                }}>Sign out other devices</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
