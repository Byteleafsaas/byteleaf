'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { calcTotals, dueFromTerms, termsToDays, totalsOf } from '@/lib/admin/billing';
import type { BillingDocument as DocT, Client as ClientT } from '@/lib/admin/billing-types';
import { assertAdmin } from '../auth';
import { allocateNumber, totalsFor } from '../billing';
import { connectDB } from '../db';
import { mail } from '../emails';
import { toClient, toDocument } from '../mappers';
import { BillingDocument, Client } from '../models';
import { renderDocumentPdf } from '../pdf';
import { getSettingsDoc } from '../settings';
import { todaySast } from '../time';

type Fail = { ok: false; error: string };
const idSchema = z.string().regex(/^[a-f0-9]{24}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const refresh = () => revalidatePath('/admin', 'layout');

/* ---------- clients ---------- */
const clientSchema = z.object({
  company: z.string().trim().min(1, 'Add the company name.').max(120),
  contactName: z.string().trim().max(120).default(''),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').or(z.literal('')).default(''),
  phone: z.string().trim().max(40).default(''),
  address: z.string().trim().max(240).default(''),
  vatNumber: z.string().trim().max(30).default(''),
});

export async function createClientAction(input: z.input<typeof clientSchema>): Promise<{ ok: true; client: ClientT } | Fail> {
  await assertAdmin();
  const p = clientSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the client details.' };
  await connectDB();
  const c = await Client.create(p.data);
  refresh();
  return { ok: true, client: toClient(c.toObject()) };
}

/* ---------- documents ---------- */
const lineSchema = z.object({
  description: z.string().trim().max(300),
  detail: z.string().trim().max(300).optional(),
  quantity: z.number().min(0).max(100000),
  rate: z.number().int().min(0).max(1_000_000_000), // cents
});
const docSchema = z.object({
  id: idSchema.optional(),
  kind: z.enum(['quote', 'invoice']),
  clientId: idSchema,
  reference: z.string().trim().max(200).default(''),
  issueDate: date,
  termsDays: z.number().int().min(0).max(365),
  lines: z.array(lineSchema).max(100),
  discountPct: z.number().min(0).max(100).default(0),
  depositPct: z.number().min(0).max(100).nullable().default(null),
  vatApplied: z.boolean().default(false),
  notes: z.string().max(2000).default(''),
});
export type DocInput = z.input<typeof docSchema>;

type SaveResult = { ok: true; document: DocT; emailed?: boolean; warning?: string } | Fail;

/** Saves a draft or (mode 'send') validates, numbers, stores totals, marks Sent, and emails the PDF. */
export async function saveDocumentAction(input: DocInput, mode: 'draft' | 'send'): Promise<SaveResult> {
  await assertAdmin();
  const p = docSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the form and try again.' };
  const d = p.data;
  await connectDB();

  const settings = await getSettingsDoc();
  const vatRegistered = !!settings.invoicing?.vatRegistered;
  if (d.vatApplied && !vatRegistered) return { ok: false, error: 'Only a VAT-registered business can charge VAT. Add your VAT number in Settings › Invoicing first.' };

  const client = await Client.findById(d.clientId);
  if (!client) return { ok: false, error: 'Choose who to bill.' };

  const existing = d.id ? await BillingDocument.findById(d.id) : null;
  if (d.id && !existing) return { ok: false, error: 'Document not found.' };
  if (existing && existing.status !== 'draft') return { ok: false, error: 'Sent documents are read-only. Void the invoice and issue a new one.' };

  const lines = d.lines.map((l) => ({ description: l.description, detail: l.detail, quantity: l.quantity, rate: l.rate }));
  const isQuote = d.kind === 'quote';
  const totals = calcTotals(lines, { discountPct: d.discountPct, vatApplied: d.vatApplied, vatRate: 15, depositPct: isQuote ? d.depositPct : null });

  if (mode === 'send') {
    if (!lines.some((l) => l.description && l.quantity > 0)) return { ok: false, error: 'Add at least one line item.' };
    if (!client.email) return { ok: false, error: 'The client needs an email address.' };
    if (totals.total <= 0) return { ok: false, error: 'The total must be more than R 0.00.' };
  }

  const dateKey = dueFromTerms(d.issueDate, d.termsDays);
  const fields = {
    kind: d.kind, clientId: client._id, reference: d.reference, issueDate: d.issueDate, termsDays: d.termsDays,
    dueDate: isQuote ? null : dateKey, validUntil: isQuote ? dateKey : null, lines, discountPct: d.discountPct,
    depositPct: isQuote ? d.depositPct : null, vatApplied: d.vatApplied, vatRate: 15, notes: d.notes,
    subtotal: totals.subtotal, discount: totals.discount, vat: totals.vat, total: totals.total,
  };

  let doc = existing;
  if (doc) {
    doc.set(fields);
  } else {
    doc = new BillingDocument({ ...fields, status: 'draft', events: [{ type: 'created' }] });
  }
  // Number is allocated atomically the first time the document is saved.
  if (!doc.number) doc.number = await allocateNumber(d.kind);
  if (mode === 'send') {
    doc.status = 'sent';
    doc.sentAt = todaySast();
    doc.pdfVersion += 1;
    doc.events.push({ type: 'sent', at: new Date() });
  }
  try {
    await doc.save();
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { ok: false, error: 'That document number is already in use. Check the next number in Settings › Invoicing.' };
    throw e;
  }

  let emailed: boolean | undefined;
  let warning: string | undefined;
  if (mode === 'send') {
    let pdf: Buffer | null = null;
    try {
      pdf = await renderDocumentPdf(String(doc._id), `${doc.pdfVersion}-${doc.updatedAt?.getTime()}`);
    } catch (e) {
      console.error('[pdf] could not render', e);
      warning = 'Sent, but the PDF could not be attached.';
    }
    emailed = await mail.documentSent(client.email, { kind: d.kind, number: doc.number!, total: totals.total, date: dateKey, contact: client.contactName }, pdf);
  }
  refresh();
  return { ok: true, document: toDocument(doc.toObject()), emailed, warning };
}

async function loadDoc(id: string) {
  await assertAdmin();
  if (!idSchema.safeParse(id).success) return null;
  await connectDB();
  return BillingDocument.findById(id);
}

export async function markPaidAction(id: string): Promise<{ ok: true; document: DocT } | Fail> {
  const doc = await loadDoc(id);
  if (!doc || doc.kind !== 'invoice') return { ok: false, error: 'Invoice not found.' };
  if (doc.status !== 'sent') return { ok: false, error: 'Only sent invoices can be marked as paid.' };
  const today = todaySast();
  const total = totalsOf(toDocument(doc.toObject())).total;
  doc.status = 'paid';
  doc.payments.push({ amount: total, paidOn: today, method: 'eft' });
  doc.events.push({ type: 'paid', at: new Date() });
  await doc.save();
  const client = await Client.findById(doc.clientId);
  if (client?.email) await mail.paymentReceived(client.email, { number: doc.number!, total, paidOn: today, contact: client.contactName ?? '' });
  refresh();
  return { ok: true, document: toDocument(doc.toObject()) };
}

export async function remindAction(id: string): Promise<{ ok: true } | Fail> {
  const doc = await loadDoc(id);
  if (!doc || doc.kind !== 'invoice' || doc.status !== 'sent') return { ok: false, error: 'Invoice not found.' };
  const client = await Client.findById(doc.clientId);
  if (!client?.email) return { ok: false, error: 'The client has no email address.' };
  let pdf: Buffer | null = null;
  try {
    pdf = await renderDocumentPdf(String(doc._id), `${doc.pdfVersion}-${doc.updatedAt?.getTime()}`);
  } catch (e) {
    console.error('[pdf] could not render', e);
  }
  await mail.paymentReminder(client.email, { number: doc.number!, total: totalsOf(toDocument(doc.toObject())).total, dueDate: doc.dueDate ?? todaySast(), contact: client.contactName ?? '' }, pdf);
  doc.events.push({ type: 'reminder', at: new Date() });
  await doc.save();
  return { ok: true };
}

/** Accepted quote → Draft invoice copying client, reference, lines, discount and VAT; the quote becomes Invoiced. */
export async function convertQuoteAction(id: string): Promise<{ ok: true; invoice: DocT; quote: DocT } | Fail> {
  const q = await loadDoc(id);
  if (!q || q.kind !== 'quote') return { ok: false, error: 'Quote not found.' };
  if (q.status !== 'accepted') return { ok: false, error: 'Only accepted quotes can be converted.' };
  const settings = await getSettingsDoc();
  const days = termsToDays(settings.invoicing?.defaultTermsDays ?? '14 days');
  const today = todaySast();
  const lines = q.lines.map((l: { description?: string | null; detail?: string | null; quantity?: number | null; rate?: number | null }) => ({ description: l.description, detail: l.detail, quantity: l.quantity, rate: l.rate }));
  const t = totalsFor({ lines, discountPct: q.discountPct, vatApplied: q.vatApplied, vatRate: q.vatRate, depositPct: null });
  const number = await allocateNumber('invoice');
  const invoice = await BillingDocument.create({
    kind: 'invoice', number, status: 'draft', clientId: q.clientId, reference: q.reference, issueDate: today, termsDays: days, dueDate: dueFromTerms(today, days),
    lines, discountPct: q.discountPct, vatApplied: q.vatApplied, vatRate: q.vatRate, notes: settings.invoicing?.defaultInvoiceNotes ?? '', quoteId: q._id, ...t,
    events: [{ type: 'created' }],
  });
  q.status = 'invoiced';
  q.events.push({ type: 'converted', at: new Date() });
  await q.save();
  refresh();
  return { ok: true, invoice: toDocument(invoice.toObject()), quote: toDocument(q.toObject()) };
}

/** Numbered invoices are voided, never deleted, so the sequence stays unbroken. */
export async function voidInvoiceAction(id: string): Promise<{ ok: true; document: DocT } | Fail> {
  const doc = await loadDoc(id);
  if (!doc || doc.kind !== 'invoice') return { ok: false, error: 'Invoice not found.' };
  if (doc.status !== 'sent') return { ok: false, error: 'Only sent invoices can be voided.' };
  doc.status = 'void';
  doc.events.push({ type: 'voided', at: new Date() });
  await doc.save();
  refresh();
  return { ok: true, document: toDocument(doc.toObject()) };
}

export async function setQuoteStatusAction(id: string, status: 'accepted' | 'declined'): Promise<{ ok: true; document: DocT } | Fail> {
  const doc = await loadDoc(id);
  if (!doc || doc.kind !== 'quote' || doc.status !== 'sent') return { ok: false, error: 'Only sent quotes can be accepted or declined.' };
  doc.status = status;
  doc.events.push({ type: status, at: new Date() });
  await doc.save();
  refresh();
  return { ok: true, document: toDocument(doc.toObject()) };
}
