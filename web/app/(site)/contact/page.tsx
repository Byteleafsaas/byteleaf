import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { ArrowIcon, ClockIcon, MailIcon, PhoneIcon, PinIcon } from '@/components/Icon';
import { getSite } from '@/lib/server/public';
import { siteContact } from '@/lib/siteContact';
import ContactForm from './ContactForm';
import s from './contact.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — Contact',
  description: "Tell us a little about your business and what you need. We'll reply within [X] business hours.",
};

export default async function Contact() {
  const c = siteContact((await getSite()).business);
  return (
    <main>
      <section className={s.sec}>
        <div className={s.col}>
          <div className={s.head}>
            <span className="rise eyebrow">CONTACT</span>
            <h1 className="rise d1 h1">Let&apos;s talk about <span className="hl">your systems.</span></h1>
            <p className="rise d2 lead">Tell us a little about your business and what you need. We&apos;ll reply within {c.replyTime}.</p>
          </div>

          <div className={`rise d3 ${s.row}`}>
            <aside className={s.info}>
              <div aria-hidden="true" className={s.map}>
                <svg className={s.mapSvg} width="100%" height="100%" viewBox="0 0 400 230" preserveAspectRatio="none">
                  <path d="M0 160 C 80 120, 140 190, 220 130 S 340 80, 400 110" stroke="#22345A" strokeWidth="10" fill="none" />
                  <path d="M120 0 C 150 80, 170 140, 160 230" stroke="#22345A" strokeWidth="8" fill="none" />
                  <path d="M260 0 L 300 230" stroke="#1A2946" strokeWidth="6" fill="none" />
                </svg>
                <div className={s.pinWrap}><span className={s.ping} /><span className={s.pin} /></div>
                <span className={s.pinLabel}>Johannesburg</span>
              </div>
              <div className={s.rows}>
                <a className={s.crow} href={c.emailHref}>
                  <span className={s.cico}><MailIcon /></span>
                  <span className={s.ctext}><span>EMAIL</span><span>{c.email}</span></span>
                </a>
                <a className={s.crow} href={c.phoneHref}>
                  <span className={s.cico}><PhoneIcon /></span>
                  <span className={s.ctext}><span>PHONE / WHATSAPP</span><span>{c.phone}</span></span>
                </a>
                <div className={s.crow}>
                  <span className={s.cico}><PinIcon /></span>
                  <span className={s.ctext}><span>STUDIO</span><span>{c.location}</span></span>
                </div>
                <div className={s.crow}>
                  <span className={s.cico}><ClockIcon /></span>
                  <span className={s.ctext}><span>HOURS</span><span>{c.hours}</span></span>
                </div>
              </div>
              <div className={s.infoCta}>
                <Link className="btn btn-primary btn-lg btn-block" href="/book">
                  Prefer to talk? Book a call
                  <ArrowIcon />
                </Link>
              </div>
            </aside>
            <div className={s.formCard}>
              <ContactForm replyTime={c.replyTime} />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
