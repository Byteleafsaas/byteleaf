import type { Metadata } from 'next';
import Link from 'next/link';
import AuthShell from '@/components/admin/AuthShell';
import a from '@/components/admin/auth.module.css';
import { findValidResetToken } from '@/lib/server/auth';
import ResetForm from './ResetForm';

export const metadata: Metadata = { title: 'Set new password' };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const valid = !!(await findValidResetToken(token));

  return (
    <AuthShell heading="A strong password keeps client data safe." text="Bookings and messages hold personal details, so protect them well.">
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div className={a.state} role="alert">
          <h1 className={a.h1}>This link has expired</h1>
          <p className={a.sub}>Reset links work once and expire after 30 minutes. Ask for a fresh one and try again.</p>
          <Link className={`${a.btn} ${a.primary}`} href="/admin/forgot-password">Send a new link</Link>
        </div>
      )}
    </AuthShell>
  );
}
