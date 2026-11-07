import type { Metadata } from 'next';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
import MobileBar from '@/components/law/MobileBar';
import SiteFooter from '@/components/law/SiteFooter';
import SiteHeader from '@/components/law/SiteHeader';
import './law.css';

// Two families only (HANDOFF-LAW §6): Fraunces for headings, Source Sans 3 for reading. Latin only, swapped in when loaded.
const serif = Fraunces({ subsets: ['latin'], weight: ['500', '600'], style: ['normal', 'italic'], variable: '--lf-serif', display: 'swap' });
const sans = Source_Sans_3({ subsets: ['latin'], weight: ['400', '600'], variable: '--lf-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Ravell Ndaba Attorneys (demo site)', template: '%s · Ravell Ndaba Attorneys (demo)' },
  robots: { index: false, follow: false },
};

export default function LawSampleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lf lf-root ${serif.variable} ${sans.variable}`} style={{ colorScheme: 'light' }}>
      <div role="note" style={{ background: '#1F1C18', color: '#F7F4EF', fontSize: '.875rem', textAlign: 'center', padding: '8px 16px', lineHeight: 1.4 }}>
        Demo site by byteleaf for a fictional law firm. The consultation form doesn’t send or store your details.
      </div>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <MobileBar />
    </div>
  );
}
