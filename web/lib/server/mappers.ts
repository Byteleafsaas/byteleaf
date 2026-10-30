import 'server-only';
// Convert Mongoose documents to the plain, serialisable shapes the admin UI and public pages use (lib/admin/types).
import type { BillingDocument as BDoc, Client as ClientT } from '@/lib/admin/billing-types';
import type { Booking, ImageRef, Message, Project, Settings } from '@/lib/admin/types';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const TZ = 'Africa/Johannesburg';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parts(d: Date) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return { y: Number(g('year')), m: Number(g('month')) - 1, d: Number(g('day')), hh: g('hour') === '24' ? '00' : g('hour'), mm: g('minute'), wd: g('weekday') };
}
const key = (d: Date) => {
  const p = parts(d);
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
};

/** '29 Oct' */
export const shortDay = (d: Date) => {
  const p = parts(d);
  return `${p.d} ${MON[p.m]}`;
};

/** '2h ago' · 'Yesterday' · 'Tue' · '19 Oct' */
export function relativeWhen(d: Date, now = new Date()): string {
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24 && key(d) === key(now)) return `${Math.floor(mins / 60)}h ago`;
  const days = Math.round((Date.UTC(...ymd(now)) - Date.UTC(...ymd(d))) / 86400000);
  if (days === 1) return 'Yesterday';
  if (days < 7) return DAYS[new Date(Date.UTC(...ymd(d))).getUTCDay()];
  return shortDay(d);
}
const ymd = (d: Date): [number, number, number] => {
  const p = parts(d);
  return [p.y, p.m, p.d];
};

/** 'Today, 08:14' · 'Thu 29 Oct, 16:02' */
export function receivedLabel(d: Date, now = new Date()): string {
  const p = parts(d);
  const t = `${p.hh}:${p.mm}`;
  if (key(d) === key(now)) return `Today, ${t}`;
  return `${DAYS[new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay()]} ${p.d} ${MON[p.m]}, ${t}`;
}

const id = (d: Any) => String(d._id);
const img = (x: Any | null | undefined): ImageRef | null => (x?.key ? { key: x.key, width: x.width, height: x.height, alt: x.alt || undefined } : null);

export function toBooking(d: Any): Booking {
  return {
    id: id(d), name: d.name, company: d.company ?? '', email: d.email, phone: d.phone ?? '', meetingType: d.meetingType, typeLabel: d.typeLabel,
    where: d.where, durationMin: d.durationMin, date: d.date, time: d.time, status: d.status, note: d.note ?? '',
    history: (d.history ?? []).map((h: Any) => ({ text: h.text, when: Date.now() - new Date(h.at).getTime() < 60000 ? 'Just now' : shortDay(new Date(h.at)) })),
  };
}

export function toMessage(d: Any): Message {
  const at = new Date(d.createdAt);
  return {
    id: id(d), name: d.name, company: d.company ?? '', email: d.email, phone: d.phone ?? '', when: relativeWhen(at), received: receivedLabel(at),
    needs: d.needs ?? [], model: d.model ?? '', start: d.start ?? '', message: d.message ?? '', read: !!d.read, archived: !!d.archived,
  };
}

export function toProject(d: Any): Project {
  return {
    id: id(d), slug: d.slug, name: d.name, client: d.client ?? '', type: d.type ?? '', industry: d.industry ?? 'Other', categories: d.categories ?? [], stack: d.stack ?? [],
    summary: d.summary ?? '', challenge: d.challenge ?? '', whatWeDid: d.whatWeDid ?? '', result: d.result ?? '', live: !!d.live, featured: !!d.featured,
    updated: d.live ? shortDay(new Date(d.updatedAt)) : 'Draft', pattern: ((d.pattern ?? 0) % 3) as 0 | 1 | 2,
    cover: img(d.cover), gallery: (d.gallery ?? []).map(img).filter((x: ImageRef | null): x is ImageRef => !!x),
  };
}

export const toClient = (d: Any): ClientT => ({
  id: id(d), company: d.company, contactName: d.contactName ?? '', email: d.email ?? '', phone: d.phone ?? '', address: d.address ?? '', vatNumber: d.vatNumber ?? '',
});

export function toDocument(d: Any): BDoc {
  return {
    id: id(d), kind: d.kind, number: d.number ?? null, status: d.status, clientId: String(d.clientId), reference: d.reference ?? '', issueDate: d.issueDate,
    dueDate: d.dueDate ?? null, validUntil: d.validUntil ?? null, termsDays: d.termsDays ?? 14,
    lines: (d.lines ?? []).map((l: Any, i: number) => ({ id: `${id(d)}-${i}`, description: l.description ?? '', detail: l.detail || undefined, quantity: l.quantity, rate: l.rate })),
    discountPct: d.discountPct ?? 0, depositPct: d.depositPct ?? null, vatApplied: !!d.vatApplied, vatRate: d.vatRate ?? 15, notes: d.notes ?? '',
    quoteId: d.quoteId ? String(d.quoteId) : null, sentAt: d.sentAt ?? null,
    payments: (d.payments ?? []).map((p: Any, i: number) => ({ id: `${id(d)}-p${i}`, amount: p.amount, paidOn: p.paidOn, method: p.method, note: p.note })),
  };
}

export function toSettings(d: Any, account: { name: string; email: string; twoStep: boolean }): Settings {
  const b = d.business ?? {};
  const a = d.availability ?? {};
  const i = d.invoicing ?? {};
  const p = d.prices ?? {};
  const price = (x: Any) => ({ text: x?.text ?? '', unit: x?.unit ?? '' });
  return {
    business: { publicEmail: b.publicEmail ?? '', phone: b.phone ?? '', location: b.location ?? '', hours: b.hours ?? '', replyWithin: b.replyWithin ?? '', urgentResponse: b.urgentResponse ?? '', notifyEmail: b.notifyEmail ?? '' },
    prices: { care: price(p.care), build: price(p.build), fix: price(p.fix), team: price(p.team), includedHours: p.includedHours ?? '' },
    availability: {
      workingDays: [...(a.workingDays ?? [])], startTimes: [...(a.startTimes ?? [])],
      meetingTypes: (a.meetingTypes ?? []).map((m: Any) => ({ key: m.key, name: m.name, where: m.where, enabled: !!m.enabled, minutes: m.minutes })),
      minNotice: a.minNotice ?? '', bufferMin: a.bufferMin ?? '', maxPerDay: a.maxPerDay ?? 4, blocked: (a.blocked ?? []).map((r: Any) => ({ from: r.from, to: r.to })),
    },
    invoicing: {
      legalName: i.legalName ?? '', regNo: i.regNo ?? '', address: i.address ?? '', vatRegistered: !!i.vatRegistered, vatNumber: i.vatNumber ?? '',
      bank: { name: i.bank?.name ?? '', accountName: i.bank?.accountName ?? '', accountNo: i.bank?.accountNo ?? '', branchCode: i.bank?.branchCode ?? '' },
      nextQuoteNo: i.nextQuoteNo, nextInvoiceNo: i.nextInvoiceNo, defaultTermsDays: i.defaultTermsDays, quoteValidDays: i.quoteValidDays, defaultDepositPct: i.defaultDepositPct, defaultInvoiceNotes: i.defaultInvoiceNotes ?? '',
    },
    account,
  };
}
