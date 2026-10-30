import type { Metadata } from 'next';
import AuthShell from '@/components/admin/AuthShell';
import ForgotForm from './ForgotForm';

export const metadata: Metadata = { title: 'Forgot password' };

export default function Page() {
  return (
    <AuthShell heading="Locked out? It happens." text="We'll email you a secure link to set a new password.">
      <ForgotForm />
    </AuthShell>
  );
}
