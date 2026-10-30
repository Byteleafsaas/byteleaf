// Fictional seed data from the designs. DEV ONLY: never ship to production.
import type { Booking, Message, Project, Settings } from './types';

export const SEED_BOOKINGS: Booking[] = [
  { id: 'b1', name: 'Thandi Mokoena', company: 'Mokoena Logistics', email: 'thandi@mokoenalogistics.co.za', phone: '+27 82 000 0001', meetingType: 'discovery', typeLabel: 'Discovery call', where: 'Video call', durationMin: 30, date: '2026-11-03', time: '09:00', status: 'pending', note: 'We run 40 delivery vans and our dispatch tool is an old PHP app nobody wants to touch. Looking for someone to maintain it and eventually rebuild it.', history: [{ text: 'Booked via website', when: '29 Oct' }] },
  { id: 'b2', name: 'Pieter van Wyk', company: 'Karoo Outdoor Co.', email: 'pieter@karooutdoor.co.za', phone: '+27 83 000 0002', meetingType: 'deep-dive', typeLabel: 'Technical deep-dive', where: 'Video call', durationMin: 60, date: '2026-11-04', time: '11:30', status: 'pending', note: 'Our Shopify store needs a custom stock sync with the warehouse system. Happy to share the API docs beforehand.', history: [{ text: 'Booked via website', when: '30 Oct' }] },
  { id: 'b3', name: 'Ayesha Patel', company: 'Patel & Sons Pharmacy', email: 'ayesha@patelpharmacy.co.za', phone: '+27 84 000 0003', meetingType: 'discovery', typeLabel: 'Discovery call', where: 'Video call', durationMin: 30, date: '2026-11-05', time: '14:30', status: 'confirmed', note: 'Ordering site times out at month-end. Need help fast.', history: [{ text: 'Booked via website', when: '27 Oct' }, { text: 'Confirmed by Gerald', when: '27 Oct' }] },
  { id: 'b4', name: 'Sipho Dlamini', company: 'Ubuntu Fitness', email: 'sipho@ubuntufitness.co.za', phone: '+27 72 000 0004', meetingType: 'in-person', typeLabel: 'In-person meeting', where: 'Johannesburg', durationMin: 60, date: '2026-11-06', time: '10:00', status: 'rescheduled', note: 'Would love to see examples of member portals you have built.', history: [{ text: 'Booked for Mon 2 Nov, 10:00', when: '22 Oct' }, { text: 'Rescheduled to Fri 6 Nov, 10:00', when: '26 Oct' }] },
  { id: 'b5', name: 'Lerato Nkosi', company: 'Nkosi Legal', email: 'lerato@nkosilegal.co.za', phone: '+27 76 000 0005', meetingType: 'discovery', typeLabel: 'Discovery call', where: 'Video call', durationMin: 30, date: '2026-11-09', time: '13:00', status: 'confirmed', note: 'Interested in AI to summarise case documents securely.', history: [{ text: 'Booked via website', when: '28 Oct' }, { text: 'Confirmed by Gerald', when: '28 Oct' }] },
  { id: 'b6', name: 'James Okafor', company: 'Brightline Retail', email: 'james@brightline.co.za', phone: '+27 79 000 0006', meetingType: 'deep-dive', typeLabel: 'Technical deep-dive', where: 'Video call', durationMin: 60, date: '2026-10-27', time: '16:00', status: 'completed', note: 'Review of our POS integration.', history: [{ text: 'Booked via website', when: '20 Oct' }, { text: 'Confirmed by Gerald', when: '20 Oct' }, { text: 'Meeting held', when: '27 Oct' }] },
  { id: 'b7', name: 'Megan Fourie', company: 'Fourie Interiors', email: 'megan@fourieinteriors.co.za', phone: '+27 71 000 0007', meetingType: 'discovery', typeLabel: 'Discovery call', where: 'Video call', durationMin: 30, date: '2026-10-28', time: '10:00', status: 'cancelled', note: 'New website for the showroom.', history: [{ text: 'Booked via website', when: '21 Oct' }, { text: 'Cancelled by client', when: '26 Oct' }] },
];

export const SEED_MESSAGES: Message[] = [
  { id: 'm1', name: 'Ayesha Patel', company: 'Patel & Sons Pharmacy', email: 'ayesha@patelpharmacy.co.za', phone: '+27 84 000 0003', when: '2h ago', received: 'Today, 08:14', needs: ['Maintenance', 'Bug fix'], model: 'Monthly maintenance contract', start: 'As soon as possible', message: 'Hi byteleaf,\n\nOur online ordering site keeps timing out at month-end when traffic spikes. The developer who built it has moved on and we have no documentation.\n\nCould you take a look and tell us what it would take to stabilise it — and then look after it monthly?\n\nThanks, Ayesha', read: false, archived: false },
  { id: 'm2', name: 'Johan Botha', company: 'Botha Engineering', email: 'johan@bothaeng.co.za', phone: '+27 82 000 0011', when: '5h ago', received: 'Today, 05:40', needs: ['New feature', 'Backend'], model: 'One-off project', start: 'Within a month', message: 'We need a quoting tool connected to our job-costing database so the sales team stops working from spreadsheets. Happy to share our current Excel model.', read: false, archived: false },
  { id: 'm3', name: 'Nomvula Zulu', company: 'Zulu Events', email: 'nomvula@zuluevents.co.za', phone: '+27 73 000 0012', when: 'Yesterday', received: 'Thu 29 Oct, 16:02', needs: ['Design', 'Frontend'], model: 'Not sure yet', start: 'In 1–3 months', message: 'Looking to redesign our booking site before the festive season. The current one is slow on phones and looks dated.', read: false, archived: false },
  { id: 'm4', name: 'Daniel Smith', company: 'Smith Auto Parts', email: 'daniel@smithauto.co.za', phone: '+27 61 000 0013', when: 'Tue', received: 'Tue 27 Oct, 11:25', needs: ['AI integration'], model: 'One-off project', start: 'Just exploring', message: 'Could AI read our supplier invoices and capture them into our accounting system automatically? We get a few hundred a month.', read: true, archived: false },
  { id: 'm5', name: 'Kgosi Molefe', company: 'Molefe Properties', email: 'kgosi@molefeprop.co.za', phone: '+27 74 000 0014', when: '19 Oct', received: 'Mon 19 Oct, 09:10', needs: ['Something else'], model: 'Not sure yet', start: 'Just exploring', message: 'Just checking if you also do hosting for WordPress sites.', read: true, archived: true },
];

const P = { client: '[Client name]', industry: 'Other', summary: '', challenge: '', whatWeDid: '', result: '', cover: null, gallery: [] };
export const SEED_PROJECTS: Project[] = [
  { ...P, id: 'p1', slug: 'online-store-rebuild', name: 'Online store rebuild', type: 'E-commerce storefront', categories: ['Design', 'Frontend', 'Backend'], stack: ['Next.js', 'Node.js'], live: true, featured: true, updated: '28 Oct', pattern: 0 },
  { ...P, id: 'p2', slug: 'invoice-reading-assistant', name: 'Invoice reading assistant', type: 'AI document assistant', categories: ['AI', 'Backend'], stack: ['LLM API', 'Python'], live: true, featured: false, updated: '21 Oct', pattern: 1 },
  { ...P, id: 'p3', slug: 'dispatch-app-care-plan', name: 'Dispatch app care plan', type: 'Maintenance contract', categories: ['Backend', 'Frontend'], stack: ['React', 'PostgreSQL'], live: true, featured: false, updated: '14 Oct', pattern: 2 },
  { ...P, id: 'p4', slug: 'member-portal-redesign', name: 'Member portal redesign', type: 'Customer portal redesign', categories: ['Design', 'Frontend'], stack: ['Figma', 'React'], live: true, featured: false, updated: '2 Oct', pattern: 0 },
  { ...P, id: 'p5', slug: 'erp-crm-sync', name: 'ERP ↔ CRM sync', type: 'Systems integration', categories: ['Backend'], stack: ['REST', 'Docker'], live: true, featured: false, updated: '19 Sep', pattern: 1 },
  { ...P, id: 'p6', slug: 'quote-approvals-bot', name: 'Quote approvals bot', type: 'Workflow automation', categories: ['AI', 'Backend'], stack: ['Automation', 'Node.js'], live: false, featured: false, updated: 'Draft', pattern: 2 },
];

export const SEED_SETTINGS: Settings = {
  business: { publicEmail: '', phone: '', location: 'Johannesburg, South Africa', hours: '', replyWithin: '4 business hours', urgentResponse: '2 hours', notifyEmail: '' },
  prices: { care: { text: '', unit: 'Per month' }, build: { text: '', unit: 'Per project' }, fix: { text: '', unit: 'Per hour' }, team: { text: '', unit: 'Custom quote' }, includedHours: '' },
  availability: {
    workingDays: [1, 2, 3, 4, 5],
    startTimes: ['09:00', '10:00', '11:30', '13:00', '14:30', '16:00'],
    meetingTypes: [
      { key: 'discovery', name: 'Discovery call', where: 'Video call', enabled: true, minutes: 30 },
      { key: 'deep-dive', name: 'Technical deep-dive', where: 'Video call', enabled: true, minutes: 60 },
      { key: 'in-person', name: 'In-person meeting', where: 'Johannesburg', enabled: true, minutes: 60 },
    ],
    minNotice: 'Next working day',
    bufferMin: '15 min',
    maxPerDay: 4,
    blocked: [{ from: '2026-12-24', to: '2027-01-02' }],
  },
  invoicing: {
    legalName: '', regNo: '', address: '', vatRegistered: false, vatNumber: '',
    bank: { name: '', accountName: '', accountNo: '', branchCode: '' },
    nextQuoteNo: 'Q-2026-016', nextInvoiceNo: 'INV-2026-035', defaultTermsDays: '14 days', quoteValidDays: '30 days', defaultDepositPct: '50%',
    defaultInvoiceNotes: 'Please use the invoice number as your payment reference. Thank you for your business.',
  },
  account: { name: 'Gerald', email: '', twoStep: false },
};
