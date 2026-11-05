import 'server-only';
import { fmtLength, fmtMoney } from '@/lib/whatsapp/copy';
import { weekFromHours, type Week } from '@/lib/whatsapp/hours';
import { upcomingHolidays } from '@/lib/whatsapp/holidays';
import { toMin, type WeekHours } from '@/lib/whatsapp/slots';
import { addDays, isoWeekday, todaySast } from '../time';
import { connectDB } from '../db';
import { env } from '../env';
import { WaAppointment, WaBusiness, WaService, WaStaff } from '../models';

/** The business the booking admin shows. One demo salon for now, as the knowledge assistant shows one demo client. */
export const BOOKING_SLUG = 'lerato';

export type BookingInfo = { slug: string; name: string; sub: string; mark: string; brand: string; numberOk: boolean; numberText: string; staffCount: number };

export async function loadBookingInfo(): Promise<BookingInfo> {
  await connectDB();
  const [b, staff] = await Promise.all([WaBusiness.findOne({ slug: BOOKING_SLUG }).lean(), WaStaff.countDocuments({ business: BOOKING_SLUG, active: true })]);
  const connected = Boolean(b?.phoneNumberId);
  return {
    slug: BOOKING_SLUG,
    name: b?.name ?? "Lerato's Braids & Beauty",
    sub: `Randburg · ${staff} staff`,
    mark: (b?.name ?? 'L')[0].toUpperCase(),
    brand: b?.brand ?? 'byteleaf',
    // Until a real number is saved the demo shows the design's connected state. Once one is, it needs the token and a send that wasn't refused.
    numberOk: connected ? Boolean(env.WHATSAPP_TOKEN) && !b?.numberProblemAt : true,
    numberText: connected ? 'WhatsApp connected' : 'WhatsApp +27 [number] · connected',
    staffCount: staff,
  };
}

export type StaffRow = { id: string; name: string; initial: string };

export type ServiceRow = {
  id: string;
  name: string;
  minutes: number;
  priceRand: number;
  bufferMin: number;
  staff: string[];
  onWhatsApp: boolean;
  line: string;
  hideName: boolean;
  /** What the WhatsApp list shows when the owner has not written their own line. */
  auto: string;
  upcoming: number;
};

export async function loadStaff(): Promise<StaffRow[]> {
  await connectDB();
  const rows = await WaStaff.find({ business: BOOKING_SLUG, active: true }).sort({ order: 1 }).lean();
  return rows.map((s) => ({ id: String(s._id), name: s.name, initial: s.name[0].toUpperCase() }));
}

export const autoLine = (minutes: number, priceCents: number) => `${fmtLength(minutes)} · ${priceCents ? fmtMoney(priceCents) : 'Free'}`;

export async function loadServices(): Promise<{ services: ServiceRow[]; staff: StaffRow[]; defaultBuffer: number }> {
  await connectDB();
  const [rows, staff, biz, upcoming] = await Promise.all([
    WaService.find({ business: BOOKING_SLUG, active: true }).sort({ order: 1 }).lean(),
    loadStaff(),
    WaBusiness.findOne({ slug: BOOKING_SLUG }, { bufferMin: 1 }).lean(),
    WaAppointment.aggregate<{ _id: unknown; n: number }>([{ $match: { business: BOOKING_SLUG, status: 'booked', startsAt: { $gt: new Date() } } }, { $group: { _id: '$serviceId', n: { $sum: 1 } } }]),
  ]);
  const defaultBuffer = biz?.bufferMin ?? 15;
  const count = new Map(upcoming.map((u) => [String(u._id), u.n]));
  const everyone = staff.map((s) => s.id);
  const services = rows.map((s) => ({
    id: String(s._id),
    name: s.name,
    minutes: s.minutes,
    priceRand: Math.round((s.priceCents ?? 0) / 100),
    bufferMin: s.bufferMin ?? defaultBuffer,
    staff: (s.staff?.length ? s.staff.map(String) : everyone).filter((id: string) => everyone.includes(id)),
    onWhatsApp: s.onWhatsApp !== false,
    line: s.waLine ?? '',
    hideName: Boolean(s.hideName),
    auto: autoLine(s.minutes, s.priceCents ?? 0),
    upcoming: count.get(String(s._id)) ?? 0,
  }));
  return { services, staff, defaultBuffer };
}

/* ---------- staff and hours ---------- */

export type TimeOff = { a: string; b: string; n: string; /** Bookings already on these days, which still need a new time. */ clash: number };
export type StaffHours = { id: string; name: string; initial: string; same: boolean; week: Week; offs: TimeOff[] };
export type HoursData = {
  today: string;
  salon: Week;
  staff: StaffHours[];
  holidays: { date: string; name: string; open: boolean }[];
  services: { id: string; name: string; minutes: number; bufferMin: number; staff: string[] }[];
  /** The next seven days, for the live preview. weekdayIndex 0 is Monday. */
  days: { date: string; dow: string; n: number; weekdayIndex: number }[];
  /** Booked time per person per date, in minutes after midnight: [start, end including clean-up]. */
  busy: Record<string, Record<string, [number, number][]>>;
};

export async function loadHours(): Promise<HoursData> {
  await connectDB();
  const today = todaySast();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1));
  const [biz, staff, services, appts, offClash] = await Promise.all([
    WaBusiness.findOne({ slug: BOOKING_SLUG }).lean(),
    WaStaff.find({ business: BOOKING_SLUG, active: true }).sort({ order: 1 }).lean(),
    loadServices(),
    WaAppointment.find({ business: BOOKING_SLUG, status: 'booked', date: { $in: dates } }, { staffId: 1, date: 1, time: 1, startsAt: 1, blocksUntil: 1 }).lean(),
    WaAppointment.find({ business: BOOKING_SLUG, status: 'booked', date: { $gte: today } }, { staffId: 1, date: 1 }).lean(),
  ]);
  const open = biz?.holidayOpen ?? [];
  const busy: HoursData['busy'] = {};
  for (const a of appts) {
    const start = toMin(a.time);
    const end = start + Math.round((a.blocksUntil.getTime() - a.startsAt.getTime()) / 60000);
    const p = (busy[String(a.staffId)] ??= {});
    (p[a.date] ??= []).push([start, end]);
  }
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    today,
    salon: weekFromHours(biz?.hours as WeekHours | undefined),
    staff: staff.map((s) => ({
      id: String(s._id),
      name: s.name,
      initial: s.name[0].toUpperCase(),
      same: !Object.keys((s.hours as object) ?? {}).length,
      week: weekFromHours(Object.keys((s.hours as object) ?? {}).length ? (s.hours as WeekHours) : (biz?.hours as WeekHours | undefined)),
      offs: (s.daysOff ?? []).map((o: { from?: string | null; to?: string | null; note?: string | null }) => ({
        a: o.from ?? '', b: o.to ?? o.from ?? '', n: o.note ?? '',
        clash: offClash.filter((x) => String(x.staffId) === String(s._id) && x.date >= (o.from ?? '') && x.date <= (o.to ?? o.from ?? '')).length,
      })),
    })),
    holidays: upcomingHolidays(today, 4).map((h) => ({ ...h, open: open.includes(h.date) })),
    services: services.services.map((s) => ({ id: s.id, name: s.name, minutes: s.minutes, bufferMin: s.bufferMin, staff: s.staff })),
    days: dates.map((date) => ({ date, dow: names[new Date(`${date}T00:00:00Z`).getUTCDay()], n: Number(date.slice(8)), weekdayIndex: isoWeekday(date) - 1 })),
    busy,
  };
}
