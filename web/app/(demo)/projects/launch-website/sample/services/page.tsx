import type { Metadata } from 'next';
import Link from 'next/link';
import { rands } from '@/lib/launch/rules';
import { blockValue, siteHref } from '@/lib/launch/site';
import { getLive } from '@/lib/server/launch/store';
import s from '../site.module.css';

export const metadata: Metadata = { title: 'Services and prices' };
export const dynamic = 'force-dynamic';

const ADD_ONS = [{ n: 'Engine bay clean', p: 'R 150' }, { n: 'Pet hair removal', p: 'R 90' }, { n: 'Headlight restore', p: 'R 200' }];

export default async function Services() {
  const live = await getLive();
  const items = live.services.filter((x) => x.visible);
  return (
    <>
      <section className={s.pageHead}>
        <div className={`${s.wrap} ${s.col}`} style={{ gap: 14 }}>
          <span className={s.tag}>Services and prices</span>
          <h1 className={s.pageH}>{blockValue(live, 'services', 's1')}</h1>
          <p className={s.lead} style={{ maxWidth: '36em' }}>{blockValue(live, 'services', 's2')}</p>
        </div>
      </section>
      <section style={{ padding: '16px 0 48px' }}>
        <div className={`${s.wrap} ${s.stack}`} style={{ gap: 16 }}>
          {items.map((x) => (
            <article key={x.id} className={`${s.card} ${s.svcCard}`}>
              <div style={{ flex: '2 1 320px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 style={{ fontSize: 30 }}>{x.name}</h2>
                <span className={s.muted}>{x.time}</span>
                {x.included.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>{x.included.map((i) => <li key={i}>{i}</li>)}</ul>}
              </div>
              <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                <span className={`${s.disp} ${s.svcPrice}`}>{rands(x.price)}</span>
                <Link href={siteHref('contact')} className={`${s.b} ${s.bPine}`}>Book this wash</Link>
              </div>
            </article>
          ))}
          {items.length === 0 && <div className={s.card}><h2 style={{ fontSize: 26 }}>Prices are coming soon</h2><p className={s.muted}>Message us on WhatsApp for a quote in the meantime.</p></div>}
          <div className={s.card} style={{ background: '#EFE6D2' }}>
            <h2 style={{ fontSize: 26 }}>Add-ons</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {ADD_ONS.map((x) => <li key={x.n} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderTop: '1px solid #E2D8C3' }}><span>{x.n}</span><strong>{x.p}</strong></li>)}
            </ul>
          </div>
          <p className={s.muted}>To book, send the form on the <Link href={siteHref('contact')} className={s.linkBtn}>contact page</Link> or message us on WhatsApp. We confirm a time within [reply time].</p>
        </div>
      </section>
    </>
  );
}
