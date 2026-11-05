import Image from 'next/image';
import type { Photo } from '@/lib/launch/types';
import s from './site.module.css';

/**
 * One photo frame. A sample photo is drawn, with a "Sample photo" chip so nobody takes it for real. An upload is the
 * real picture, with no chip. `art` picks the drawing for a sample: a car, or a portrait.
 */
export default function PhotoFrame({ photo, ratio, art = 'car', sizes }: { photo: Photo; ratio: string; art?: 'car' | 'person'; sizes: string }) {
  if (photo.kind === 'upload' && photo.key) {
    return (
      <div className={s.phImg} style={{ aspectRatio: ratio }}>
        <Image src={`/media/${photo.key}`} alt={photo.alt} fill sizes={sizes} style={{ objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div className={s.ph} style={{ aspectRatio: ratio }} role="img" aria-label={photo.alt || 'Sample photo'}>
      {art === 'car' ? (
        <svg width="180" height="90" viewBox="0 0 180 90" aria-hidden="true"><path d="M20 62h140v-14l-20-6-22-20H62L40 42l-20 6z" fill="#FAF6EC" /><circle cx="52" cy="66" r="12" fill="#10261B" /><circle cx="128" cy="66" r="12" fill="#10261B" /></svg>
      ) : (
        <svg width="120" height="140" viewBox="0 0 120 140" aria-hidden="true"><circle cx="60" cy="44" r="28" fill="#FAF6EC" /><path d="M10 140c4-36 26-54 50-54s46 18 50 54z" fill="#FAF6EC" /></svg>
      )}
      <span className={s.cap}>Sample photo{photo.caption ? ` · ${photo.caption}` : ''}</span>
    </div>
  );
}
