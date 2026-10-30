import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LogoMark } from '@/components/Logo';
import { totalsOf } from '@/lib/admin/billing';
import { fmtShort, formatZAR } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/server/auth';
import { connectDB } from '@/lib/server/db';
import { toClient, toDocument } from '@/lib/server/mappers';
import { BillingDocument, Client } from '@/lib/server/models';
import { getAdminSettings } from '@/lib/server/settings';
import s from './print.module.css';

export const metadata: Metadata = { title: 'Document' };

// Rendered by Chromium to make the PDF (the pdf route forwards the admin session cookie). Admin-only.
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin(`/admin/billing/${id}/print`);
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();
  await connectDB();
  const raw = await BillingDocument.findById(id).lean();
  if (!raw) notFound();
  const doc = toDocument(raw);
  const clientRaw = await Client.findById(raw.clientId).lean();
  const client = clientRaw ? toClient(clientRaw) : undefined;
  const settings = await getAdminSettings(admin.id);
  const isQuote = doc.kind === 'quote';
  const paid = !isQuote && doc.status === 'paid';
  const t = totalsOf(doc);
  const inv = settings.invoicing;
  const due = isQuote ? doc.validUntil : doc.dueDate;

  return (
    <div className={s.stage}>
      <div className={s.page}>
        <div className={s.bar} />
        <div className={s.body}>
          <div className={s.top}>
            <div className={s.brand}>
              <span className={s.logo}><LogoMark size={36} />byteleaf</span>
              <span className={s.contact}>
                {settings.business.location || 'Johannesburg, South Africa'}<br />
                {settings.business.publicEmail || '[hello@yourdomain.co.za]'} · {settings.business.phone || '[+27 00 000 0000]'}<br />
                Reg. no. {inv.regNo || '[Registration number]'}
                {doc.vatApplied && <><br />VAT no. {inv.vatNumber || '[VAT number]'}</>}
              </span>
            </div>
            <div className={s.titleBox}>
              <span className={s.title}>{isQuote ? 'QUOTE' : doc.vatApplied ? 'TAX INVOICE' : 'INVOICE'}</span>
              <span className={s.no}>{doc.number}</span>
              {paid && <span className={s.paid}>PAID</span>}
            </div>
          </div>

          <div className={s.meta}>
            <div className={s.col}>
              <span className={s.k}>BILL TO</span>
              <span className={s.big}>{client?.company}</span>
              <span>{client?.contactName}</span>
              <span className={s.muted}>{client?.email}</span>
              <span className={s.muted}>{client?.address || '[Client address]'}</span>
              {client?.vatNumber && <span className={s.muted}>VAT no. {client.vatNumber}</span>}
            </div>
            <div className={s.col}>
              <span className={s.k}>ISSUED</span>
              <span>{fmtShort(doc.issueDate)}</span>
              <span className={s.k} style={{ paddingTop: 8 }}>{isQuote ? 'VALID UNTIL' : 'PAYMENT DUE'}</span>
              <span style={{ fontWeight: 600 }}>{due ? fmtShort(due) : 'On receipt'}</span>
            </div>
            <div className={s.col}>
              <span className={s.k}>PROJECT</span>
              <span style={{ fontWeight: 500 }}>{doc.reference}</span>
            </div>
          </div>

          <div className={s.table}>
            <div className={`${s.tr} ${s.th}`}><span>#</span><span>DESCRIPTION</span><span>QTY</span><span>RATE</span><span>AMOUNT</span></div>
            {doc.lines.map((l, i) => (
              <div key={l.id} className={s.tr}>
                <span className={s.n}>{String(i + 1).padStart(2, '0')}</span>
                <span className={s.desc}><span>{l.description}</span>{l.detail && <span>{l.detail}</span>}</span>
                <span>{l.quantity}</span>
                <span>{formatZAR(l.rate)}</span>
                <span className={s.amt}>{formatZAR(t.lines[i])}</span>
              </div>
            ))}
          </div>

          <div className={s.totalsWrap}>
            <div className={s.totals}>
              <div className={s.line}><span className={s.l}>Subtotal</span><span className={s.v}>{formatZAR(t.subtotal)}</span></div>
              {t.discount > 0 && <div className={s.line}><span className={s.l}>Discount ({doc.discountPct}%)</span><span className={s.v}>−{formatZAR(t.discount)}</span></div>}
              {doc.vatApplied && <div className={s.line}><span className={s.l}>VAT ({doc.vatRate}%)</span><span className={s.v}>{formatZAR(t.vat)}</span></div>}
              <div className={`${s.line} ${s.grand}`}><span className={s.l}>{isQuote ? 'Quote total' : 'Total due'}</span><span className={s.v}>{formatZAR(t.total)}</span></div>
              {isQuote && !!doc.depositPct && <div className={`${s.line} ${s.dep}`}><span className={s.l}>Deposit to start ({doc.depositPct}%)</span><span className={s.v}>{formatZAR(t.deposit)}</span></div>}
            </div>
          </div>

          <div className={s.foot}>
            <div className={s.fcol}>
              <span className={s.k}>PAYMENT DETAILS</span>
              <span>Bank: {inv.bank.name || '[Bank name]'}</span>
              <span>Account name: {inv.bank.accountName || '[Account name]'}</span>
              <span>Account no.: {inv.bank.accountNo || '[Account number]'} · Branch: {inv.bank.branchCode || '[Branch code]'}</span>
              <span>Reference: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{doc.number}</span></span>
            </div>
            <div className={s.fcol}>
              <span className={s.k}>{isQuote ? 'TERMS' : 'NOTES'}</span>
              <span className={s.notes}>{doc.notes}</span>
              {isQuote && <span className={s.sign}><span>Accepted by (name &amp; signature)</span><span>Date</span></span>}
            </div>
          </div>

          <div className={s.thanks}>
            <span>Thank you for working with byteleaf.</span>
            <span className={`${s.mono} ${s.pageNo}`}>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
