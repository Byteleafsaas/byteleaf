import 'server-only';
import { calcTotals } from '@/lib/admin/billing';
import type { DocKind } from '@/lib/admin/billing-types';
import { connectDB } from './db';
import { SettingsModel } from './models';
import { getSettingsDoc } from './settings';

/**
 * Atomically allocate the next sequential number for the kind and advance the counter (HANDOFF-ADMIN §8.2).
 * A unique index on (kind, number) on documents is the final guard, so a number can never be used twice.
 */
export async function allocateNumber(kind: DocKind): Promise<string> {
  await connectDB();
  await getSettingsDoc(); // make sure the settings document exists
  const field = kind === 'quote' ? 'invoicing.nextQuoteNo' : 'invoicing.nextInvoiceNo';
  const ref = `$${field}`;
  // One atomic findOneAndUpdate: the update pipeline advances the counter ("INV-2026-035" → "INV-2026-036", keeping the
  // zero-padding) and we get the document as it was BEFORE the update, i.e. the number we just claimed. No read-then-write race.
  const m = { $regexFind: { input: ref, regex: '^(.*-)([0-9]+)$' } };
  const prefix = { $arrayElemAt: ['$$m.captures', 0] };
  const digits = { $arrayElemAt: ['$$m.captures', 1] };
  const padded = { $concat: ['0000000000', { $toString: { $add: [{ $toInt: digits }, 1] } }] };
  const bump = {
    $let: {
      vars: { m },
      in: {
        $concat: [prefix, { $let: { vars: { s: padded, w: { $strLenCP: digits } }, in: { $substrCP: ['$$s', { $max: [0, { $subtract: [{ $strLenCP: '$$s' }, '$$w'] }] }, 20] } } }],
      },
    },
  };
  const before = await SettingsModel.findOneAndUpdate({ key: 'site' }, [{ $set: { [field]: bump } }], { returnDocument: 'before', updatePipeline: true }).lean();
  const claimed = kind === 'quote' ? before?.invoicing?.nextQuoteNo : before?.invoicing?.nextInvoiceNo;
  if (!claimed) throw new Error('Could not allocate a document number. Please try again.');
  return claimed;
}

/** Totals stored on the document at send time (cents). */
export function totalsFor(d: { lines: { quantity: number; rate: number }[]; discountPct: number; vatApplied: boolean; vatRate: number; depositPct: number | null }) {
  const t = calcTotals(d.lines, { discountPct: d.discountPct, vatApplied: d.vatApplied, vatRate: d.vatRate, depositPct: d.depositPct });
  return { subtotal: t.subtotal, discount: t.discount, vat: t.vat, total: t.total };
}
