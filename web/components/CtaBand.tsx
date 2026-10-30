import Link from 'next/link';
import { ArrowIcon } from './Icon';

type Props = { title: string; text: string; secondary?: { href: string; label: string } };

export default function CtaBand({ title, text, secondary }: Props) {
  return (
    <section className="sec-tail">
      <div className="cta">
        <svg aria-hidden="true" className="cta-leaf" width="420" height="420" viewBox="0 0 32 32">
          <path d="M4 28C4 14 14 4 28 4C28 18 18 28 4 28Z" fill="#FFFFFF" />
        </svg>
        <div className="cta-text">
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        {secondary ? (
          <div className="cta-actions">
            <Link className="btn btn-light" href="/book">
              Book a call
              <ArrowIcon />
            </Link>
            <Link className="btn btn-outline-light" href={secondary.href}>
              {secondary.label}
            </Link>
          </div>
        ) : (
          <Link className="btn btn-light" href="/book">
            Book a call
            <ArrowIcon />
          </Link>
        )}
      </div>
    </section>
  );
}
