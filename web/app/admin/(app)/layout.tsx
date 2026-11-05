import AdminShell from '@/components/admin/Shell';
import { AssistantCountsProvider } from '@/lib/admin/assistant-counts';
import { BookingInfoProvider } from '@/lib/admin/booking-info';
import { WebsiteInfoProvider } from '@/lib/admin/website-info';
import { AdminStoreProvider } from '@/lib/admin/store';
import { loadAssistantCounts } from '@/lib/server/assistant/admin';
import { requireAdmin } from '@/lib/server/auth';
import { loadAdminData } from '@/lib/server/data';
import { loadBookingInfo } from '@/lib/server/whatsapp/admin';
import { loadWebsiteInfo } from '@/lib/server/launch/admin';

// Always rendered per request: it reads the session cookie and the database.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [data, counts, booking, website] = await Promise.all([loadAdminData(admin.id), loadAssistantCounts('khumalo'), loadBookingInfo(), loadWebsiteInfo()]);
  return (
    <AdminStoreProvider initial={data} user={{ name: admin.name, email: admin.email }}>
      <AssistantCountsProvider counts={counts}>
        <BookingInfoProvider info={booking}>
          <WebsiteInfoProvider info={website}>
            <AdminShell>{children}</AdminShell>
          </WebsiteInfoProvider>
        </BookingInfoProvider>
      </AssistantCountsProvider>
    </AdminStoreProvider>
  );
}
