import type { Metadata } from 'next';
import { WORKSPACES } from '@/lib/assistant/workspaces';
import { STAFF_DOMAIN, getStaff } from '@/lib/server/assistant/staff';
import s from './staff.module.css';
import StaffApp from './StaffApp';
import StaffGate from './StaffGate';

export const metadata: Metadata = { title: 'byteleaf — Staff assistant', description: 'The internal assistant for a business’s team, behind a work-email sign-in.', robots: { index: false } };

// Signed-in state lives in a cookie, so this page is always rendered per request.
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [staff, q] = await Promise.all([getStaff(), searchParams]);
  const w = WORKSPACES.khumalo;
  if (staff) return <StaffApp name={staff.name} email={staff.email} business={w.business} />;
  return (
    <div className={s.page}>
      <header className={s.bar}>
        <span className={s.logo} aria-hidden="true">{w.business[0]}</span>
        <div className={s.barTxt}><b>{w.business.split(' ')[0]} staff assistant</b><small>INTERNAL · AI · answers from company documents</small></div>
      </header>
      <StaffGate domain={STAFF_DOMAIN.khumalo} expired={q.error === 'expired'} />
    </div>
  );
}
