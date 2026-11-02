import Link from 'next/link';
import { SITE } from '@/lib/content';
import { getSite } from '@/lib/server/public';
import { siteContact } from '@/lib/siteContact';
import { LogoMark } from './Logo';

export default async function Footer({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const year = new Date().getFullYear();
  const contact = siteContact((await getSite()).business);

  if (variant === 'compact') {
    return (
      <footer className="footer-compact">
        <div className="footer-compact-in">
          <span className="logo">
            <LogoMark size={28} dot={false} />
            byteleaf
          </span>
          <div className="footer-compact-links">
            <Link className="flink" href="/about">About</Link>
            <Link className="flink" href="/services">Services</Link>
            <Link className="flink" href="/workflow">Workflow</Link>
            <Link className="flink" href="/projects">Projects</Link>
            <Link className="flink" href="/contact">Contact</Link>
          </div>
          <span>© {year} byteleaf · Johannesburg</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="footer-in">
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="logo">
              <LogoMark size={30} dot={false} />
              byteleaf
            </span>
            <p>{SITE.tagline}</p>
          </div>
          <div className="footer-col">
            <span className="label">COMPANY</span>
            <Link className="flink" href="/about">About</Link>
            <Link className="flink" href="/services">Services</Link>
            <Link className="flink" href="/workflow">Workflow</Link>
            <Link className="flink" href="/projects">Projects</Link>
          </div>
          <div className="footer-col">
            <span className="label">GET IN TOUCH</span>
            <Link className="flink" href="/contact">Contact</Link>
            <Link className="flink" href="/book">Book a call</Link>
            <span className="plain" style={{ lineHeight: 'normal' }}>{contact.email}</span>
          </div>
          <div className="footer-col">
            <span className="label">STUDIO</span>
            <span className="plain">
              {contact.location.split(', ').map((line, i) => (
                <span key={line}>{i > 0 && <br />}{line}</span>
              ))}
            </span>
          </div>
        </div>
        <div className="footer-bar">
          <span>© {year} byteleaf</span>
          <span>Made in Jozi</span>
        </div>
      </div>
    </footer>
  );
}
