// Billing rules (HANDOFF-ADMIN §8). Pure functions: the client preview mirrors the server and both use these.
import type { BillingDocument, DisplayStatus, LineItem } from './billing-types';
import { addDaysKey } from './format';

/** Half-up rounding to the nearest cent. */
const roundHalfUp = (n: number) => Math.floor(n + 0.5);

export type Totals = { lines: number[]; subtotal: number; discount: number; net: number; vat: number; total: number; deposit: number };

/**
 * amount_i = round(quantity × rate) per line; subtotal = Σ amount;
 * discount = round(subtotal × discountPct / 100); net = subtotal − discount;
 * vat = vatApplied ? round(net × vatRate / 100) : 0; total = net + vat; deposit = round(total × depositPct / 100).
 * Money is integer cents. Quantity and percentages are scaled to integers first to avoid float drift.
 */
export function calcTotals(
  lines: Pick<LineItem, 'quantity' | 'rate'>[],
  opts: { discountPct?: number; vatApplied?: boolean; vatRate?: number; depositPct?: number | null } = {},
): Totals {
  const { discountPct = 0, vatApplied = false, vatRate = 15, depositPct = null } = opts;
  const amounts = lines.map((l) => roundHalfUp((Math.round(l.quantity * 100) * Math.round(l.rate)) / 100));
  const subtotal = amounts.reduce((a, b) => a + b, 0);
  const pct = Math.min(100, Math.max(0, discountPct));
  const discount = roundHalfUp((subtotal * Math.round(pct * 100)) / 10000);
  const net = subtotal - discount;
  const vat = vatApplied ? roundHalfUp((net * Math.round(vatRate * 100)) / 10000) : 0;
  const total = net + vat;
  const deposit = depositPct ? roundHalfUp((total * Math.round(depositPct * 100)) / 10000) : 0;
  return { lines: amounts, subtotal, discount, net, vat, total, deposit };
}

export const totalsOf = (d: BillingDocument): Totals =>
  calcTotals(d.lines, { discountPct: d.discountPct, vatApplied: d.vatApplied, vatRate: d.vatRate, depositPct: d.depositPct });

/** 'overdue' is computed: an invoice that is sent and past its due date. Quotes past validity show as expired. */
export function displayStatus(d: BillingDocument, today: string): DisplayStatus {
  if (d.kind === 'invoice' && d.status === 'sent' && d.dueDate && d.dueDate < today) return 'overdue';
  if (d.kind === 'quote' && d.status === 'sent' && d.validUntil && d.validUntil < today) return 'expired';
  return d.status;
}

export const dueFromTerms = (issue: string, days: number) => (days === 0 ? null : addDaysKey(issue, days));

const pad = (n: number, w = 3) => String(n).padStart(w, '0');
/** Q-2026-016 → { prefix: 'Q-2026-', n: 16, width: 3 } */
export function parseNumber(no: string) {
  const m = /^(.*-)(\d+)$/.exec(no);
  return m ? { prefix: m[1], n: Number(m[2]), width: m[2].length } : null;
}
export function bumpNumber(no: string) {
  const p = parseNumber(no);
  return p ? `${p.prefix}${pad(p.n + 1, p.width)}` : no;
}

/** Settings terms strings ('14 days' / 'On receipt') → days. */
export const termsToDays = (t: string) => (/receipt/i.test(t) ? 0 : parseInt(t, 10) || 14);
export const pctFromText = (t: string) => (/none/i.test(t) ? 0 : parseInt(t, 10) || 0);
