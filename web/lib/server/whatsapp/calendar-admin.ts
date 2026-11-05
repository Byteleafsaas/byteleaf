import 'server-only';
import { fmtMoney } from '@/lib/whatsapp/copy';
import { historyLine, maskPhone, statusOf, weekDates, type Booking } from '@/lib/whatsapp/calendar-model';
import { rangesOn, toMin } from '@/lib/whatsapp/slots';
import { addDays, todaySast } from '../time';
import { connectDB } from '../db';
import { WaAppointment, WaClient } from '../models';
import { loadData, staffRanges, type Data } from './calendar';
import { BOOKING_SLUG } from './admin';

export type DayStaff = { /** Working ranges after breaks, time off and holidays, in minutes after midnight. */ ranges: [number, number][]; /** Why they can't be booked all day, or ''. */ off: string };
export type DayInfo = { closed: boolean; per: Record<string, DayStaff> };
export type CalendarData = {
  today: string;
  nowMin: number;
  /** The seven days of the week being shown, then the days after, which the move and new-booking pickers need. */
  dates: string[];
  staff: { id: string; name: string; initial: string; sub: string }[];
  days: Record<string, DayInfo>;
  bookings: Booking[];
  services: { id: string; name: string; minutes: number; priceRand: number; bufferMin: number; staff: string[] }[];
  /** The grid runs from here to here (minutes), widened when hours or bookings need it. */
  g0: number;
  g1: number;
  /** Who is signed in, for "Added by …" and "moved by you". */
  by: string;
  /** Has this business ever had a booking? When not, the calendar shows the set-up list instead. */
  any: boolean;
  setup: { services: boolean; hours: boolean };
};

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon 2 Nov, 19:42" in Johannesburg time. */
function stamp(d: Date): string {
  const s = new Date(d.getTime() + 2 * 3600000);
  return `${DOW[s.getUTCDay()]} ${s.getUTCDate()} ${MON[s.getUTCMonth()]}, ${String(s.getUTCHours()).padStart(2, '0')}:${String(s.getUTCMinutes()).padStart(2, '0')}`;
}

function dayFor(d: Data, date: string): DayInfo {
  const closed = !rangesOn(date, d.biz.hours, d.biz.daysOff).length;
  const per: Record<string, DayStaff> = {};
  for (const st of d.staff) {
    const ranges = staffRanges(d, st, date).map((r): [number, number] => [toMin(r.start), toMin(r.end)]);
    const offRow = st.daysOff.find((o) => date >= o.from && date <= o.to) as ({ note?: string } & { from: string; to: string }) | undefined;
    per[String(st.id)] = { ranges, off: closed ? '' : offRow ? `Time off${offRow.note ? ` · ${offRow.note}` : ''}` : ranges.length ? '' : 'Not working' };
  }
  return { closed, per };
}

export async function loadCalendar(anchor: string, by: string, now = new Date()): Promise<CalendarData | null> {
  const d = await loadData(BOOKING_SLUG, { all: true });
  if (!d) return null;
  await connectDB();
  const today = todaySast(now);
  const week = weekDates(anchor);
  // The pickers offer the next two weeks, so those days' hours and bookings are loaded too.
  const dates = [...new Set([...week, ...Array.from({ length: 14 }, (_, i) => addDays(today, i))])].sort();
  const sast = new Date(now.getTime() + 2 * 3600000);
  const days: Record<string, DayInfo> = {};
  for (const date of dates) days[date] = dayFor(d, date);

  const rows = await WaAppointment.find({ business: BOOKING_SLUG, status: { $in: ['booked', 'no_show'] }, date: { $gte: dates[0], $lte: dates[dates.length - 1] } }).sort({ startsAt: 1 }).lean();
  const clientIds = [...new Set(rows.map((r) => String(r.clientId)))];
  const [clients, past] = await Promise.all([
    WaClient.find({ _id: { $in: clientIds } }, { phone: 1, notes: 1 }).lean(),
    WaAppointment.find({ clientId: { $in: clientIds }, status: { $in: ['booked', 'completed', 'no_show'] } }, { clientId: 1, startsAt: 1, serviceName: 1, date: 1 }).sort({ startsAt: 1 }).lean(),
  ]);
  const byClient = new Map(clients.map((c) => [String(c._id), c]));
  const history = new Map<string, { startsAt: Date; serviceName?: string | null; date: string }[]>();
  for (const p of past) history.set(String(p.clientId), [...(history.get(String(p.clientId)) ?? []), p]);

  const bookings: Booking[] = rows.map((a) => {
    const c = byClient.get(String(a.clientId));
    const s = toMin(a.time);
    const minutes = Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000);
    const hist = (history.get(String(a.clientId)) ?? []).filter((h) => h.startsAt.getTime() <= a.startsAt.getTime());
    const prev = hist.filter((h) => h.startsAt.getTime() < a.startsAt.getTime()).pop();
    const wa = a.source !== 'manual';
    const moved = a.movedBy ? ` · moved by ${a.movedBy === 'client' ? 'the client' : 'you'}` : '';
    return {
      id: String(a._id), date: a.date, staffId: String(a.staffId), s, e: s + minutes, buf: Math.round((a.blocksUntil.getTime() - a.endsAt.getTime()) / 60000),
      client: a.clientName || 'Client', service: a.serviceName ?? '', price: a.priceCents ? fmtMoney(a.priceCents) : 'Free',
      source: wa ? 'wa' : 'hand', status: statusOf(a), phone: maskPhone(c?.phone ?? a.clientPhone ?? ''),
      sourceLine: `${wa ? 'Booked on WhatsApp' : `Added by ${a.createdBy || 'the owner'}`} · ${stamp(a.createdAt ?? a.startsAt)}${moved}`,
      reminder: a.reminderFailedAt ? 'failed' : a.confirmedAt && wa ? 'confirmed' : (a.reminders?.length ?? 0) ? 'sent' : 'none',
      history: historyLine(hist.length, prev && { service: prev.serviceName ?? '', date: prev.date }), note: c?.notes ?? '',
    };
  });

  let g0 = 8 * 60;
  let g1 = 18 * 60;
  for (const day of Object.values(days)) for (const p of Object.values(day.per)) for (const [a, b] of p.ranges) { g0 = Math.min(g0, Math.floor(a / 60) * 60); g1 = Math.max(g1, Math.ceil(b / 60) * 60); }
  for (const b of bookings) { g0 = Math.min(g0, Math.floor(b.s / 60) * 60); g1 = Math.max(g1, Math.ceil((b.e + b.buf) / 60) * 60); }

  const any = (await WaAppointment.countDocuments({ business: BOOKING_SLUG })) > 0;
  return {
    any, setup: { services: d.services.length > 0, hours: Object.keys(d.biz.hours).length > 0 },
    today, nowMin: sast.getUTCHours() * 60 + sast.getUTCMinutes(), dates, by, g0, g1, days, bookings,
    staff: d.staff.map((s) => ({ id: String(s.id), name: s.name, initial: s.name[0].toUpperCase(), sub: '' })),
    services: d.services.map((s) => ({ id: String(s.id), name: s.name, minutes: s.minutes, priceRand: Math.round(s.priceCents / 100), bufferMin: s.bufferMin ?? d.biz.bufferMin, staff: (s.staff.length ? s.staff : d.staff.map((x) => x.id)).map(String) })),
  };
}
