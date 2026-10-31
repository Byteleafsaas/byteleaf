'use client';

import Link from 'next/link';
import ListSelect from '@/components/ListSelect';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ICON, PathIcon } from '@/components/admin/icons';
import { PillTabs, SearchBox, StatusPill, TopBar } from '@/components/admin/Ui';
import s from '@/components/admin/admin.module.css';
import b from '@/components/admin/billing.module.css';
import { displayStatus, totalsOf } from '@/lib/admin/billing';
import type { BillingDocument, DisplayStatus } from '@/lib/admin/billing-types';
import { fmtShort, formatZAR, todayKey } from '@/lib/admin/format';
import { useAdmin } from '@/lib/admin/store';
import { convertQuoteAction, markPaidAction, remindAction } from '@/lib/server/actions/billing';

type Type = 'all' | 'quote' | 'invoice';
const TABS: [Type, string][] = [['all', 'All'], ['quote', 'Quotes'], ['invoice', 'Invoices']];
const STATUSES = ['any', 'draft', 'sent', 'overdue', 'paid', 'accepted', 'declined'] as const;
const INVOICE_ICON = 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4';
const QUOTE_ICON = 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h4';

export default function BillingList() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Inner() {
  const { documents, setDocuments, clients, notify, refresh } = useAdmin();
  const router = useRouter();
  const params = useSearchParams();
  const [today] = useState(todayKey);
  const [q, setQ] = useState('');
  const [flash, setFlash] = useState('');

  const typeP = params.get('type') as Type | null;
  const type: Type = typeP === 'quote' || typeP === 'invoice' ? typeP : 'all';
  const statusP = params.get('status') ?? 'any';
  const status = (STATUSES as readonly string[]).includes(statusP) ? statusP : 'any';
  const setParams = (t: Type, st: string) => router.replace(`/admin/billing?type=${t}&status=${st}`);

  const clientOf = (id: string) => clients.find((c) => c.id === id);
  const view = documents.map((d) => ({ d, st: displayStatus(d, today), total: totalsOf(d).total, client: clientOf(d.clientId)?.company ?? '—' }));

  const inv = view.filter((x) => x.d.kind === 'invoice');
  const outstanding = inv.filter((x) => x.d.status === 'sent');
  const overdue = inv.filter((x) => x.st === 'overdue');
  const thisMonth = today.slice(0, 7);
  const paidThisMonth = inv.filter((x) => x.d.payments.some((p) => p.paidOn.startsWith(thisMonth)));
  const waiting = view.filter((x) => x.d.kind === 'quote' && x.d.status === 'sent');
  const sum = (xs: typeof view) => xs.reduce((a, x) => a + x.total, 0);

  const kpis = [
    { label: 'Outstanding', value: sum(outstanding), note: `${plural(outstanding.length, 'unpaid invoice', 'unpaid invoices')}`, dot: '#1877F2', red: false },
    { label: 'Overdue', value: sum(overdue), note: overdue.length ? `${plural(overdue.length, 'invoice past its due date', 'invoices past their due date')}` : 'Nothing overdue', dot: '#B42318', red: overdue.length > 0 },
    { label: 'Paid this month', value: sum(paidThisMonth), note: `${plural(paidThisMonth.length, 'invoice settled', 'invoices settled')}`, dot: '#0B7A55', red: false },
    { label: 'Quotes awaiting reply', value: sum(waiting), note: `${plural(waiting.length, 'quote out with a client', 'quotes out with clients')}`, dot: '#C27C0E', red: false },
  ];

  const term = q.trim().toLowerCase();
  const rows = view
    .filter((x) => type === 'all' || x.d.kind === type)
    .filter((x) => status === 'any' || x.st === status)
    .filter((x) => !term || `${x.d.number ?? ''} ${x.client} ${x.d.reference}`.toLowerCase().includes(term));

  const flashRow = (id: string) => {
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? '' : f)), 1700);
  };

  const replace = (doc: BillingDocument) => setDocuments((all) => all.map((x) => (x.id === doc.id ? doc : x)));

  const markPaid = async (d: BillingDocument, client: string) => {
    const r = await markPaidAction(d.id);
    if (!r.ok) return notify(r.error);
    replace(r.document);
    flashRow(d.id);
    notify(`${d.number} marked as paid — receipt emailed to ${client}.`);
    refresh();
  };
  const remind = async (d: BillingDocument, client: string) => {
    const r = await remindAction(d.id);
    if (!r.ok) return notify(r.error);
    flashRow(d.id);
    notify(`Payment reminder sent to ${client}.`);
  };
  // Convert: a draft invoice copying client, reference, lines, discount and VAT; the quote becomes Invoiced.
  const convert = async (d: BillingDocument) => {
    const r = await convertQuoteAction(d.id);
    if (!r.ok) return notify(r.error);
    setDocuments((all) => [r.invoice, ...all.map((x) => (x.id === r.quote.id ? r.quote : x))]);
    flashRow(r.invoice.id);
    notify(`${d.number} converted to draft invoice ${r.invoice.number}.`);
    refresh();
  };

  return (
    <>
      <TopBar crumb="Admin / Quotes & invoices" title="Quotes & invoices">
        <SearchBox label="Search quotes and invoices" placeholder="Number or client…" value={q} onChange={setQ} />
        <Link className={`${s.btn} ${s.btnGhost}`} href="/admin/billing/new?type=quote">New quote</Link>
        <Link className={`${s.btn} ${s.btnPrimary}`} href="/admin/billing/new?type=invoice">
          <PathIcon d={ICON.plus} sw={2.2} />
          New invoice
        </Link>
      </TopBar>

      <div className={s.content}>
        <div className={b.kpis}>
          {kpis.map((k) => (
            <div key={k.label} className={`${s.panel} ${b.kpi} ${s.rise}`}>
              <span className={b.kpiLabel}><span aria-hidden="true" className={b.kpiDot} style={{ background: k.dot }} />{k.label}</span>
              <span className={b.kpiVal} style={{ color: k.red ? '#912018' : undefined }}>{formatZAR(k.value)}</span>
              <span className={b.kpiNote}>{k.note}</span>
            </div>
          ))}
        </div>

        <div className={b.toolbar}>
          <PillTabs label="Document type" value={type} onChange={(t) => setParams(t, status)} tabs={TABS.map(([key, label]) => ({ key, label, count: documents.filter((d) => key === 'all' || d.kind === key).length }))} />
          <div className={b.statusSel}>
            <label htmlFor="st">Status</label>
            <ListSelect id="st" className={b.statusPick} triggerClass={b.statusTrigger} value={status} options={STATUSES.map((x) => ({ value: x, label: x === 'any' ? 'Any' : x.charAt(0).toUpperCase() + x.slice(1) }))} onChange={(v) => setParams(type, v)} />
          </div>
        </div>

        <section className={`${s.panel} ${s.rise} ${s.d2} ${s.ov}`} aria-label="Documents">
          <div className={b.thead}>
            <span style={{ width: 168 }}>NUMBER</span><span style={{ flex: '1 1 200px' }}>CLIENT</span><span style={{ width: 150 }}>DATES</span>
            <span style={{ width: 130, textAlign: 'right' }}>AMOUNT</span><span style={{ width: 96 }}>STATUS</span><span style={{ width: 210, textAlign: 'right' }}>ACTIONS</span>
          </div>
          <ul className={s.ul}>
            {rows.map(({ d, st, total, client }) => {
              const isInv = d.kind === 'invoice';
              const due = isInv ? d.dueDate : d.validUntil;
              const pdf = `/admin/billing/${d.id}/print`;
              return (
                <li key={d.id} className={`${b.drow} ${flash === d.id ? b.flash : ''}`}>
                  <span className={b.cNo}>
                    <span aria-hidden="true" className={`${b.kind} ${isInv ? b.kindInv : b.kindQuote}`}><PathIcon d={isInv ? INVOICE_ICON : QUOTE_ICON} size={16} /></span>
                    <a className={b.no} href={pdf} target="_blank" rel="noreferrer">{d.number ?? 'Draft'}</a>
                  </span>
                  <span className={b.cClient}><strong>{client}</strong><span>{d.reference}</span></span>
                  <span className={b.cDates}>
                    <span>Issued {d.status === 'draft' ? '—' : fmtShort(d.issueDate).replace(/ \d{4}$/, '')}</span>
                    <span style={{ color: st === 'overdue' ? '#912018' : 'var(--muted)' }}>{isInv ? 'Due' : 'Valid to'} {d.status === 'draft' || !due ? '—' : fmtShort(due).replace(/ \d{4}$/, '')}</span>
                  </span>
                  <span className={b.cAmt}>{formatZAR(total)}</span>
                  <span className={b.cStatus}><StatusPill status={st as DisplayStatus} /></span>
                  <span className={b.cActs}>
                    {isInv && (st === 'sent' || st === 'overdue') && <button type="button" className={`${b.act} ${b.actPri}`} onClick={() => markPaid(d, client)}>Mark paid</button>}
                    {isInv && st === 'overdue' && <button type="button" className={b.act} onClick={() => remind(d, client)}>Remind</button>}
                    {!isInv && d.status === 'accepted' && <button type="button" className={`${b.act} ${b.actPri}`} onClick={() => convert(d)}>Convert to invoice</button>}
                    {d.status === 'draft' && <Link className={b.act} href={`/admin/billing/${d.id}`}>Continue</Link>}
                    <a className={b.ibtn} href={pdf} target="_blank" rel="noreferrer" aria-label={`Open ${d.number ?? 'draft'} as PDF`}>
                      <PathIcon d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                    </a>
                  </span>
                </li>
              );
            })}
          </ul>
          {rows.length === 0 && (
            <div className={s.emptyBox}>
              <strong>Nothing matches</strong>
              <span>Try another type or status.</span>
            </div>
          )}
        </section>
        <p className={b.foot}>Amounts in South African rand. Invoices become overdue automatically after their due date.</p>
      </div>
    </>
  );
}
