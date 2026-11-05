import type { Metadata } from 'next';
import CalendarView, { type View } from '@/components/booking-admin/CalendarView';
import { requireAdmin } from '@/lib/server/auth';
import { todaySast } from '@/lib/server/time';
import { loadCalendar } from '@/lib/server/whatsapp/calendar-admin';

export const metadata: Metadata = { title: 'Calendar · Booking assistant' };
export const dynamic = 'force-dynamic';

const isDate = (s?: string) => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; date?: string; staff?: string; id?: string }> }) {
  const q = await searchParams;
  const admin = await requireAdmin();
  const date = isDate(q.date) ? q.date! : todaySast();
  const view: View = q.view === 'week' || q.view === 'list' ? q.view : 'day';
  const data = await loadCalendar(date, admin.name);
  if (!data) return <p style={{ padding: 32 }}>The booking assistant isn’t set up yet. Run <code>npm run seed-whatsapp</code>.</p>;
  const staff = q.staff && data.staff.some((p) => p.id === q.staff) ? q.staff : 'all';
  return <CalendarView data={data} view={view} date={date} staff={staff} selId={q.id && data.bookings.some((b) => b.id === q.id) ? q.id : ''} />;
}
