import type { Metadata } from 'next';
import Image from 'next/image';
import { blockValue, galleryPhotos, hasRealWhatsApp, waLink, wantsPhotos } from '@/lib/launch/site';
import { getView } from '@/lib/server/launch/store';
import s from '../site.module.css';

export const metadata: Metadata = { title: 'Gallery' };
export const dynamic = 'force-dynamic';

export default async function Gallery({ searchParams }: { searchParams: Promise<{ photos?: string }> }) {
  const { snap: live } = await getView();
  const q = await searchParams;
  const photos = wantsPhotos(q.photos) ? galleryPhotos(live) : [];
  const wa = waLink(live.settings);
  return (
    <>
      <section className={s.pageHead}>
        <div className={`${s.wrap} ${s.col}`} style={{ gap: 14 }}>
          <span className={s.tag}>Gallery</span>
          <h1 className={s.pageH}>{blockValue(live, 'gallery', 'g1')}</h1>
          <p className={s.lead}>{blockValue(live, 'gallery', 'g2')}</p>
        </div>
      </section>
      <section style={{ padding: '16px 0 64px' }}>
        <div className={s.wrap}>
          {photos.length > 0 ? (
            <ul className={s.gal}>
              {photos.map((p) => (
                <li key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {p.kind === 'upload' && p.key ? (
                    <div className={s.phImg} style={{ aspectRatio: '16 / 10' }}><Image src={`/media/${p.key}`} alt={p.alt} fill quality={92} sizes="(max-width: 700px) 100vw, 380px" style={{ objectFit: 'cover' }} loading="lazy" /></div>
                  ) : (
                    <div className={s.pair} role="img" aria-label={`${p.caption}, before and after (sample photos)`}>
                      <div className={s.ph} style={{ aspectRatio: '1', background: 'linear-gradient(135deg,#C9BFA8,#A99E86)' }}><span className={s.cap}>Before</span></div>
                      <div className={s.ph} style={{ aspectRatio: '1' }}><span className={s.cap}>After</span></div>
                    </div>
                  )}
                  <span className={s.muted} style={{ fontSize: 15 }}>{p.caption || p.alt}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={s.card} style={{ alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 14 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1E5B3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M21 17l-5-5-8 7" /></svg>
              <h2 style={{ fontSize: 30 }}>Photos are on their way</h2>
              <p className={s.muted} style={{ maxWidth: '30em' }}>We’re collecting before-and-after shots from this month’s washes. In the meantime, ask us on WhatsApp for pictures of a car like yours.</p>
              <a className={`${s.b} ${s.bPine}`} href={wa} {...(hasRealWhatsApp(live.settings) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>Message us on WhatsApp</a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
