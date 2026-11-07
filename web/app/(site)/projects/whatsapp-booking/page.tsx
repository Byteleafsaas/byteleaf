import type { Metadata } from 'next';
import { SHOWCASE as M, eyebrowFor } from '@/lib/projects-meta';
import Link from 'next/link';
import QRCode from 'qrcode';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { DEMO_LINK, DEMO_NUMBER } from '@/lib/whatsapp/demo';
import Story from './Story';
import s from './demo.module.css';

export const metadata: Metadata = {
  title: `byteleaf — ${M.whatsapp.name}`,
  description: 'Clients book, change and cancel appointments in a short guided WhatsApp chat, and the owner sees every booking in a calendar. Tap through a demo with sample data.',
};

const HOW = [
  { n: '01', t: 'Connect your number', d: 'We register your WhatsApp Business number and get your message templates approved. Your clients keep the number they know.' },
  { n: '02', t: 'Load your diary', d: 'Your services, prices, staff and hours go in once. The assistant only ever offers times that really exist.' },
  { n: '03', t: 'Test it, then go live', d: 'You book, move and cancel from your own phone first. When it feels right, we switch it on.' },
];

export default async function Page() {
  // The code holds the same wa.me link as the button, so scanning it opens a chat with the demo number.
  const qr = await QRCode.toDataURL(DEMO_LINK, { margin: 1, width: 264, errorCorrectionLevel: 'M' });
  return (
    <main>
      <section className={s.hero}>
        <div className={s.heroIn}>
          <span className={s.crumb}><Link href="/projects">Projects</Link> / {M.whatsapp.name}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
            <span className="eyebrow">{eyebrowFor(M.whatsapp)}</span>
            <h1 className="h1">Clients book in the chat. <span className="hl">You see it in the calendar.</span></h1>
            <p className="lead">Clients can book, reschedule and cancel from WhatsApp. Try a booking below and watch the appointment appear in the owner’s calendar.</p>
          </div>
          <div className={s.warn} role="note">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><strong>Interactive demo.</strong> The guided walkthrough uses sample appointments for Lerato’s Braids &amp; Beauty, a fictional salon. It runs in your browser and sends no WhatsApp messages.</span>
          </div>
        </div>
      </section>

      <section className={s.main}><Story /></section>

      <section className={s.extra}>
        <div className={s.extraIn}>
          <div className={s.tryCard}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.qr} src={qr} width={132} height={132} alt={`QR code that opens a WhatsApp chat with ${DEMO_NUMBER}`} />
            <div className={s.tryText}>
              <h2>Try it on your own phone</h2>
              <p>Ask us to add your number to the tester list, then scan the code or message <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{DEMO_NUMBER}</strong> on WhatsApp to try a test booking. Reply STOP to opt out.</p>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <a className="btn btn-primary btn-sm" href={DEMO_LINK} target="_blank" rel="noopener noreferrer">Open in WhatsApp</a>
                <Link className="btn btn-ghost btn-sm" href="/contact">Ask to be added</Link>
              </span>
            </div>
          </div>
          <div className={s.real}>
            <h2>Built for how bookings really go</h2>
            <ul>
              <li>Holds the chosen time while the client confirms.</li>
              <li>Reminders the day before, with confirm, change and cancel.</li>
              <li>A person can step in at any moment, and hand back.</li>
              <li>Asks for consent and lets clients opt out by replying STOP.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={s.how}>
        <div className={s.howIn}>
          <h2 className="h2">How we set it up for you</h2>
          <ol className={s.howGrid}>
            {HOW.map((h) => (
              <li key={h.n} className={s.step}><span className={s.num}>{h.n}</span><h3>{h.t}</h3><p>{h.d}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand title="Want clients to book on WhatsApp?" text="We’ll connect your number, set up your services and hours, and test the booking flow with you." />
      <Footer />
    </main>
  );
}
