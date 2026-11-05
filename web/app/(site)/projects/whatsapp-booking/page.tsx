import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import Story from './Story';
import s from './demo.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — WhatsApp booking assistant',
  description: 'Clients book, change and cancel appointments in a short guided WhatsApp chat, and the owner sees every booking in a calendar. Tap through a demo with sample data.',
};

const HOW = [
  { n: '01', t: 'Connect your number', d: 'We register your WhatsApp Business number and get your message templates approved. Your clients keep the number they know.' },
  { n: '02', t: 'Load your diary', d: 'Your services, prices, staff and hours go in once. The assistant only ever offers times that really exist.' },
  { n: '03', t: 'Test it, then go live', d: 'You book, move and cancel from your own phone first. When it feels right, we switch it on.' },
];

export default function Page() {
  return (
    <main>
      <section className={s.hero}>
        <div className={s.heroIn}>
          <span className={s.crumb}><Link href="/projects">Projects</Link> / WhatsApp booking assistant</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
            <span className="eyebrow">SHOWCASE PROJECT 2 OF 4 · AUTOMATION</span>
            <h1 className="h1">Clients book in the chat. <span className="hl">You see it in the calendar.</span></h1>
            <p className="lead">A short guided chat on the WhatsApp number your clients already use. Tap through it below, and watch the owner’s side change as you go.</p>
          </div>
          <div className={s.warn} role="note">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span><strong>This is a demo with sample data.</strong> Lerato’s Braids &amp; Beauty is a made-up salon. Nothing here sends a real message or books a real appointment. The phone is our own drawing of a chat app, not WhatsApp itself.</span>
          </div>
        </div>
      </section>

      <section className={s.main}><Story /></section>

      <section className={s.extra}>
        <div className={s.extraIn}>
          <div className={s.tryCard}>
            <div className={s.qr} role="img" aria-label="QR code placeholder for the demo number">[QR code]</div>
            <div className={s.tryText}>
              <h2>Try it on your own phone</h2>
              <p>Scan the code or message <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>[demo WhatsApp number]</strong>. It’s a sandbox: bookings are fake and the diary resets every night. Reply STOP to stop at any time.</p>
            </div>
          </div>
          <div className={s.real}>
            <h2>Built for how bookings really go</h2>
            <ul>
              <li>Never double-books: a time is held while the client confirms.</li>
              <li>Reminders the day before, with confirm, change and cancel.</li>
              <li>A person can step in at any moment, and hand back.</li>
              <li>Asks consent first, and STOP always works (POPIA).</li>
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

      <CtaBand title="Want bookings to run themselves?" text="We’ll connect your number, load your services and hours, and test it with you before it goes live." />
      <Footer />
    </main>
  );
}
