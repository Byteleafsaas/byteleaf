import AdminShell from '@/components/admin/Shell';
import { AdminStoreProvider } from '@/lib/admin/store';
import { requireAdmin } from '@/lib/server/auth';
import { loadAdminData } from '@/lib/server/data';

// Always rendered per request: it reads the session cookie and the database.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const data = await loadAdminData(admin.id);
  return (
    <AdminStoreProvider initial={data} user={{ name: admin.name, email: admin.email }}>
      <AdminShell>{children}</AdminShell>
    </AdminStoreProvider>
  );
}
