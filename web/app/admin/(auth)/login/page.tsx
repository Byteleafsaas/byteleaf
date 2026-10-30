import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthShell from '@/components/admin/AuthShell';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function Page() {
  return (
    <AuthShell heading="Everything behind the website, in one place." text="Bookings, messages and projects — managed by the byteleaf team.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
