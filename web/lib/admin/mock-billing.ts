// Fictional billing seed data from the designs. DEV ONLY: never ship to production.
import type { BillingDocument, Client, LineItem, Payment } from './billing-types';

const addr = '[Client address]';
export const SEED_CLIENTS: Client[] = [
  { id: 'c1', company: 'Karoo Outdoor Co.', contactName: 'Pieter van Wyk', email: 'pieter@karooutdoor.co.za', phone: '+27 83 000 0002', address: addr, vatNumber: '' },
  { id: 'c2', company: 'Patel & Sons Pharmacy', contactName: 'Ayesha Patel', email: 'ayesha@patelpharmacy.co.za', phone: '+27 84 000 0003', address: addr, vatNumber: '' },
  { id: 'c3', company: 'Mokoena Logistics', contactName: 'Thandi Mokoena', email: 'thandi@mokoenalogistics.co.za', phone: '+27 82 000 0001', address: addr, vatNumber: '' },
  { id: 'c4', company: 'Botha Engineering', contactName: 'Johan Botha', email: 'johan@bothaeng.co.za', phone: '+27 82 000 0011', address: addr, vatNumber: '' },
  { id: 'c5', company: 'Ubuntu Fitness', contactName: 'Sipho Dlamini', email: 'sipho@ubuntufitness.co.za', phone: '+27 72 000 0004', address: addr, vatNumber: '' },
  { id: 'c6', company: 'Brightline Retail', contactName: 'James Okafor', email: 'james@brightline.co.za', phone: '+27 79 000 0006', address: addr, vatNumber: '' },
  { id: 'c7', company: 'Nkosi Legal', contactName: 'Lerato Nkosi', email: 'lerato@nkosilegal.co.za', phone: '+27 76 000 0005', address: addr, vatNumber: '' },
  { id: 'c8', company: 'Fourie Interiors', contactName: 'Megan Fourie', email: 'megan@fourieinteriors.co.za', phone: '+27 71 000 0007', address: addr, vatNumber: '' },
];

const L = (id: string, description: string, rands: number, detail?: string, quantity = 1): LineItem => ({ id, description, detail, quantity, rate: rands * 100 });

const QUOTE_NOTES = 'This quote is valid for the period shown. Work starts once the deposit is received. Accept by replying to the email or signing below.';
const INV_NOTES = 'Please use the invoice number as your payment reference. Thank you for your business.';

const base = { vatApplied: false, vatRate: 15, discountPct: 0, quoteId: null, sentAt: null, payments: [] as Payment[] };

export const SEED_DOCUMENTS: BillingDocument[] = [
  { ...base, id: 'd1', kind: 'invoice', number: 'INV-2026-031', status: 'sent', clientId: 'c2', reference: 'Ordering site stabilisation', issueDate: '2026-10-02', dueDate: '2026-10-16', validUntil: null, termsDays: 14, lines: [L('l1', 'Ordering site stabilisation', 18400)], depositPct: null, notes: INV_NOTES, sentAt: '2026-10-02' },
  { ...base, id: 'd2', kind: 'invoice', number: 'INV-2026-032', status: 'paid', clientId: 'c3', reference: 'Care plan — October', issueDate: '2026-10-01', dueDate: '2026-10-15', validUntil: null, termsDays: 14, lines: [L('l1', 'Maintenance contract — October care plan', 12500)], depositPct: null, notes: INV_NOTES, sentAt: '2026-10-01', payments: [{ id: 'pay1', amount: 1250000, paidOn: '2026-10-12', method: 'eft' }] },
  { ...base, id: 'd3', kind: 'invoice', number: 'INV-2026-033', status: 'sent', clientId: 'c5', reference: 'Member portal — milestone 1 of 2', issueDate: '2026-10-30', dueDate: '2026-11-13', validUntil: null, termsDays: 14, lines: [L('l1', 'UX & UI design', 4200, 'Member journeys, wireframes and final screens'), L('l2', 'Frontend build — milestone 1', 5600, 'Sign-in, profile and class booking screens')], depositPct: null, notes: 'Payment due within 14 days. Please use the invoice number as your payment reference.', sentAt: '2026-10-30' },
  { ...base, id: 'd4', kind: 'invoice', number: 'INV-2026-034', status: 'draft', clientId: 'c6', reference: 'POS integration review', issueDate: '2026-10-30', dueDate: '2026-11-13', validUntil: null, termsDays: 14, lines: [L('l1', 'POS integration review', 6250)], depositPct: null, notes: INV_NOTES },
  { ...base, id: 'd5', kind: 'quote', number: 'Q-2026-014', status: 'sent', clientId: 'c1', reference: 'Shopify ↔ warehouse stock sync', issueDate: '2026-10-28', dueDate: null, validUntil: '2026-11-27', termsDays: 30, lines: [L('l1', 'Discovery & technical scoping', 6500, 'Workshop, API review and written integration plan'), L('l2', 'Stock sync integration — build & testing', 36000, 'Two-way sync, error alerts, staging and production rollout'), L('l3', 'Handover documentation & training', 5500, 'Runbook, admin guide and a one-hour team session')], depositPct: 50, notes: 'Valid until the date above. Work starts once the 50% deposit is received; the balance is invoiced on delivery. Sign below or reply to the email to accept.', sentAt: '2026-10-28' },
  { ...base, id: 'd6', kind: 'quote', number: 'Q-2026-013', status: 'accepted', clientId: 'c7', reference: 'AI case-document summariser', issueDate: '2026-10-20', dueDate: null, validUntil: '2026-11-19', termsDays: 30, lines: [L('l1', 'AI case-document summariser', 65000)], depositPct: 50, notes: QUOTE_NOTES, sentAt: '2026-10-20' },
  { ...base, id: 'd7', kind: 'quote', number: 'Q-2026-012', status: 'declined', clientId: 'c8', reference: 'Showroom website', issueDate: '2026-10-12', dueDate: null, validUntil: '2026-11-11', termsDays: 30, lines: [L('l1', 'Showroom website', 32000)], depositPct: 50, notes: QUOTE_NOTES, sentAt: '2026-10-12' },
  { ...base, id: 'd8', kind: 'quote', number: 'Q-2026-015', status: 'draft', clientId: 'c4', reference: 'Sales quoting tool', issueDate: '2026-10-30', dueDate: null, validUntil: '2026-11-29', termsDays: 30, lines: [L('l1', 'Sales quoting tool', 54000)], depositPct: 50, notes: QUOTE_NOTES },
];

export const QUOTE_DEFAULT_NOTES = QUOTE_NOTES;
export const INVOICE_DEFAULT_NOTES = INV_NOTES;
