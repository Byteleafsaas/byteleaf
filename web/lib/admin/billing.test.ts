import { describe, expect, it } from 'vitest';
import { bumpNumber, calcTotals, displayStatus, termsToDays } from './billing';
import type { BillingDocument } from './billing-types';
import { formatZAR } from './format';

describe('calcTotals', () => {
  it('sums lines with no discount or VAT', () => {
    const t = calcTotals([{ quantity: 1, rate: 650000 }, { quantity: 2, rate: 100000 }]);
    expect(t.subtotal).toBe(850000);
    expect(t.total).toBe(850000);
    expect(t.vat).toBe(0);
  });

  it('rounds half-up per line: qty 0.5 × R 333.33 = R 166.67', () => {
    const t = calcTotals([{ quantity: 0.5, rate: 33333 }]);
    expect(t.lines[0]).toBe(16667);
  });

  it('applies discount before VAT', () => {
    // subtotal R 1 000.00, 10% off = R 900.00, VAT 15% = R 135.00
    const t = calcTotals([{ quantity: 1, rate: 100000 }], { discountPct: 10, vatApplied: true });
    expect(t.discount).toBe(10000);
    expect(t.net).toBe(90000);
    expect(t.vat).toBe(13500);
    expect(t.total).toBe(103500);
  });

  it('rounds VAT half-up on awkward amounts', () => {
    // net 0.10 → VAT 0.015 → rounds up to 0.02 (2 cents)
    const t = calcTotals([{ quantity: 1, rate: 10 }], { vatApplied: true });
    expect(t.vat).toBe(2);
    expect(t.total).toBe(12);
  });

  it('computes the quote deposit from the total', () => {
    const t = calcTotals([{ quantity: 1, rate: 4800000 }], { depositPct: 50 });
    expect(t.deposit).toBe(2400000);
  });

  it('clamps the discount to 0–100%', () => {
    expect(calcTotals([{ quantity: 1, rate: 1000 }], { discountPct: 250 }).total).toBe(0);
    expect(calcTotals([{ quantity: 1, rate: 1000 }], { discountPct: -5 }).total).toBe(1000);
  });

  it('handles an empty document', () => {
    expect(calcTotals([]).total).toBe(0);
  });
});

describe('formatZAR', () => {
  it('formats with a space thousands separator and a dot decimal', () => {
    expect(formatZAR(4800000)).toBe('R 48 000.00');
    expect(formatZAR(5)).toBe('R 0.05');
    expect(formatZAR(123456789)).toBe('R 1 234 567.89');
  });
});

describe('numbering and status', () => {
  it('bumps sequential numbers keeping the width', () => {
    expect(bumpNumber('Q-2026-016')).toBe('Q-2026-017');
    expect(bumpNumber('INV-2026-099')).toBe('INV-2026-100');
  });
  it('reads terms', () => {
    expect(termsToDays('14 days')).toBe(14);
    expect(termsToDays('On receipt')).toBe(0);
  });
  it('shows a sent invoice past its due date as overdue', () => {
    const d = { kind: 'invoice', status: 'sent', dueDate: '2026-10-16', validUntil: null } as BillingDocument;
    expect(displayStatus(d, '2026-10-30')).toBe('overdue');
    expect(displayStatus({ ...d, dueDate: '2026-11-13' }, '2026-10-30')).toBe('sent');
    expect(displayStatus({ ...d, status: 'paid' }, '2026-10-30')).toBe('paid');
  });
});
