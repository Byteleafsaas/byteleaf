import type { Metadata } from 'next';
import Link from 'next/link';
import { logoWord } from '@/lib/launch/rules';
import { aboutPhoto, blockValue, siteHref, wantsPhotos } from '@/lib/launch/site';
import { getLive } from '@/lib/server/launch/store';
import PhotoFrame from '../Photo';
import s from '../site.module.css';

export const metadata: Metadata = { title: 'About us' };
export const dynamic = 'force-dynamic';

const VALUES = [
  { t: 'On time', d: 'We message when we’re on our way.' },
  { t: 'Careful', d: 'Soft cloths, no harsh brushes.' },
  { t: 'Insured', d: '[Insurance detail to confirm].' },
];

export default async function About({ searchParams }: { searchParams: Promise<{ photos?: string }> }) {
  const live = await getLive();
  const q = await searchParams;
  const photo = wantsPhotos(q.photos) ? aboutPhoto(live) : null;
  const word = logoWord(live.settings.name);
  return (
    <section style={{ padding: '56px 0 64px' }}>
      <div className={s.wrap} style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          {photo ? (
            <PhotoFrame photo={photo} ratio="4 / 5" art="person" sizes="(max-width: 860px) 100vw, 380px" />
          ) : (
            <div className={s.aboutCard}>
              <span className={s.disp} style={{ fontSize: 96, lineHeight: 0.9 }}>{word}<span style={{ color: '#FAF6EC' }}>.</span></span>
              <span style={{ fontWeight: 600 }}>[Owner name], founder<br /><span style={{ fontWeight: 400 }}>Washing cars in Pretoria since [year]</span></span>
            </div>
          )}
        </div>
        <div className={s.col} style={{ flex: '2 1 460px', gap: 18 }}>
          <span className={s.tag}>About us</span>
          <h1 className={s.pageH54}>{blockValue(live, 'about', 'a1')}</h1>
          <p style={{ fontSize: 19 }}>{blockValue(live, 'about', 'a2')}</p>
          <p className={s.muted}>We use low-water products that are safe on paint, glass and leather, and we never leave until you’ve had a look and you’re happy.</p>
          <ul className={s.values}>
            {VALUES.map((v) => <li key={v.t} className={s.card} style={{ padding: 18 }}><strong>{v.t}</strong><span className={s.muted} style={{ fontSize: 15 }}>{v.d}</span></li>)}
          </ul>
          <div><Link href={siteHref('contact')} className={`${s.b} ${s.bSun}`}>Book a wash</Link></div>
        </div>
      </div>
    </section>
  );
}
