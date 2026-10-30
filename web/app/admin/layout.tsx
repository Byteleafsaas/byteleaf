import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'byteleaf admin', template: 'byteleaf admin — %s' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
