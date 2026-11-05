import type { Metadata } from 'next';
import Link from 'next/link';
import { rands } from '@/lib/launch/rules';
import { areaSpan, blockOf, blockValue, fromPrice, hasRealWhatsApp, hoursLine, homePhoto, sectionOn, siteHref, waLink, wantsPhotos } from '@/lib/launch/site';
import { homeServices } from '@/lib/launch/ops';
import { getView } from '@/lib/server/launch/store';
import PhotoFrame from './Photo';
import s from './site.module.css';

export const metadata: Metadata = { title: 'Mobile car wash in Pretoria' };
export const dynamic = 'force-dynamic';

const STEPS = [
  { n: '1', t: 'Book in a minute', d: 'Use the form or WhatsApp. Tell us where the car is and when.' },
  { n: '2', t: 'We arrive ready', d: 'We bring water, power and everything else. You carry on with your day.' },
  { n: '3', t: 'Pay when you’re happy', d: 'Check the car first, then pay by card, EFT or cash.' },
];
const REVIEWS = [
  { q: 'They washed my car in the office parking while I was in meetings. It looked new.', w: 'Thandi, Menlyn' },
  { q: 'On time, friendly, and the inside smells clean for the first time in years.', w: 'Pieter, Centurion' },
  { q: 'Booked on WhatsApp in two minutes. Easiest errand of my week.', w: 'Kamo, Hatfield' },
];
const FAQ = [
  { q: 'Do you bring your own water and power?', a: 'Yes. Our van carries water and a quiet generator, so we only need space around the car.' },
  { q: 'How do I pay?', a: 'Card, EFT or cash, after you’ve checked the car.' },
  { q: 'What if it rains?', a: 'We’ll message you the day before to move your booking at no charge.' },
  { q: 'Can you do a fleet or several cars?', a: 'Yes. Ask for a quote and we’ll plan a visit that suits your business.' },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ photos?: string }> }) {
  const { snap: live } = await getView();
  const q = await searchParams;
  const biz = live.settings;
  const photo = wantsPhotos(q.photos) ? homePhoto(live) : null;
  const top = homeServices(live.services);
  const from = fromPrice(live.services);
  const primary = blockOf(live, 'home', 'h3');
  const target = primary && primary.type === 'button' ? primary.target : 'contact';
  const primaryHref = target === 'whatsapp' ? waLink(biz) : target === 'call' ? `tel:${biz.phone.replace(/[\s\-()]/g, '')}` : siteHref('contact');
  const wa = waLink(biz);
  const waExternal = hasRealWhatsApp(biz);

  return (
    <>
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.heroIn}`}>
          <div className={s.col} style={{ flex: '1 1 460px' }}>
            <span className={s.tag}>Mobile car wash · Pretoria</span>
            <h1 className={s.heroH}>{blockValue(live, 'home', 'h1')}</h1>
            <p className={s.lead}>{blockValue(live, 'home', 'h2')}</p>
            <div className={s.row}>
              <a className={`${s.b} ${s.bSun}`} href={primaryHref}>{blockValue(live, 'home', 'h3')}</a>
              <a className={`${s.b} ${s.bLine}`} href={wa} {...(waExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>Message us on WhatsApp</a>
            </div>
            <ul className={s.facts}>
              <li>{hoursLine(biz.hours)}</li>
              {biz.areas.length > 0 && <li>{areaSpan(biz.areas)}</li>}
              {from && <li>From <strong style={{ color: '#10261B' }}>{from}</strong></li>}
            </ul>
          </div>
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            {photo ? (
              <PhotoFrame photo={photo} ratio="4 / 3" sizes="(max-width: 860px) 100vw, 560px" />
            ) : (
              <div className={s.pricesCard}>
                <span className={s.label}>Today’s prices</span>
                {top.map((x) => (
                  <div key={x.id} className={s.pRow}>
                    <span className={s.disp} style={{ display: 'flex', flexDirection: 'column' }}><span className={s.n}>{x.name}</span><span className={s.t}>{x.time}</span></span>
                    <span className={`${s.disp} ${s.p}`}>{rands(x.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {sectionOn(live, 'home', 'h5') && (
        <section aria-labelledby="hw" className={`${s.band} ${s.bandWhite}`}>
          <div className={`${s.wrap} ${s.stack}`} style={{ gap: 28 }}>
            <h2 id="hw" className={s.h2}>How it works</h2>
            <ol className={s.steps}>
              {STEPS.map((x) => (
                <li key={x.n} className={s.step}>
                  <span className={`${s.disp} ${s.stepN}`} aria-hidden="true">{x.n}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><h3>{x.t}</h3><span className={s.muted}>{x.d}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <section aria-labelledby="sv" className={s.section}>
        <div className={`${s.wrap} ${s.stack}`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
            <h2 id="sv" className={s.h2}>Washes and prices</h2>
            <Link href={siteHref('services')} className={s.linkBtn}>What’s included in each</Link>
          </div>
          <div className={s.cards}>
            {top.map((x) => (
              <div key={x.id} className={s.card}>
                <span className={s.muted} style={{ fontSize: 14 }}>{x.time}</span>
                <h3 style={{ fontSize: 24 }}>{x.name}</h3>
                <span className={s.muted} style={{ fontSize: 15, flex: 1 }}>{x.summary}</span>
                <span className={s.disp} style={{ fontSize: 30 }}>{rands(x.price)}</span>
              </div>
            ))}
            {top.length === 0 && <p className={s.muted}>Prices are coming soon. Message us for a quote.</p>}
          </div>
        </div>
      </section>

      {biz.areas.length > 0 && (
        <section aria-labelledby="ar" className={`${s.band} ${s.bandPine}`}>
          <div className={`${s.wrap}`} style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 48px', alignItems: 'center' }}>
            <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 id="ar" className={s.h2}>Where we wash</h2>
              <p style={{ color: '#CFE0D4' }}>Not on the list? Message us. If we’re nearby that day, we’ll come.</p>
            </div>
            <ul className={s.chips}>{biz.areas.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        </section>
      )}

      {sectionOn(live, 'home', 'h8') && (
        <section aria-labelledby="rv" className={s.section}>
          <div className={`${s.wrap} ${s.stack}`}>
            <h2 id="rv" className={s.h2}>What customers say</h2>
            <div className={`${s.cards} ${s.cards3}`}>
              {REVIEWS.map((r) => (
                <figure key={r.w} className={s.card} style={{ margin: 0 }}>
                  <span className={s.sampleTag}>Sample review</span>
                  <blockquote style={{ margin: 0, fontSize: 18, lineHeight: 1.5 }}>“{r.q}”</blockquote>
                  <figcaption className={s.muted} style={{ fontSize: 14 }}>{r.w}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {sectionOn(live, 'home', 'h9') && (
        <section aria-labelledby="fq" style={{ padding: '0 0 64px' }}>
          <div className={s.wrap} style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 64px' }}>
            <h2 id="fq" className={s.h2} style={{ flex: '1 1 260px' }}>Questions</h2>
            <div style={{ flex: '2 1 480px', borderBottom: '1px solid #E2D8C3' }}>
              {FAQ.map((f) => <details key={f.q} className={s.fq}><summary>{f.q}</summary><p>{f.a}</p></details>)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
