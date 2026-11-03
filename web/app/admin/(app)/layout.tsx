import AdminShell from '@/components/admin/Shell';
import { AssistantCountsProvider } from '@/lib/admin/assistant-counts';
import { AdminStoreProvider } from '@/lib/admin/store';
import { loadAssistantCounts } from '@/lib/server/assistant/admin';
import { requireAdmin } from '@/lib/server/auth';
import { loadAdminData } from '@/lib/server/data';

// Always rendered per request: it reads the session cookie and the database.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [data, counts] = await Promise.all([loadAdminData(admin.id), loadAssistantCounts('khumalo')]);
  return (
    <AdminStoreProvider initial={data} user={{ name: admin.name, email: admin.email }}>
      <AssistantCountsProvider counts={counts}>
        <AdminShell>{children}</AdminShell>
      </AssistantCountsProvider>
    </AdminStoreProvider>
  );
}
