// Billing data shapes (HANDOFF-ADMIN §7). Money is integer cents (ZAR); dates are 'YYYY-MM-DD' (SAST).

export type DocKind = 'quote' | 'invoice';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'invoiced';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';
export type DocStatus = QuoteStatus | InvoiceStatus;
/** Display status: invoices that are sent and past due show as 'overdue' (computed, never stored). */
export type DisplayStatus = DocStatus | 'overdue';

export type Client = { id: string; company: string; contactName: string; email: string; phone: string; address: string; vatNumber: string };

export type LineItem = { id: string; description: string; detail?: string; quantity: number; rate: number /* cents */ };

export type Payment = { id: string; amount: number; paidOn: string; method?: 'eft' | 'card' | 'cash'; note?: string };

export type BillingDocument = {
  id: string;
  kind: DocKind;
  number: string | null; // allocated on first save; unique per kind
  status: DocStatus;
  clientId: string;
  reference: string;
  issueDate: string;
  dueDate: string | null; // invoice
  validUntil: string | null; // quote
  termsDays: number; // invoice: days to pay (0 = on receipt); quote: days valid
  lines: LineItem[];
  discountPct: number;
  depositPct: number | null; // quotes only
  vatApplied: boolean;
  vatRate: number; // 15
  notes: string;
  quoteId: string | null; // invoice created from a quote
  sentAt: string | null;
  payments: Payment[];
};
