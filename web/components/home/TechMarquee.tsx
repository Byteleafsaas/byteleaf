import { TECH } from '@/lib/content';
import s from '@/app/(site)/home.module.css';

export default function TechMarquee() {
  const items = [...TECH, ...TECH];
  return (
    <section aria-label="Technologies" className={s.stackBand}>
      <div className={s.stackLabel}>
        <p>The stack we work in every day</p>
      </div>
      <div className={s.mask}>
        <div className={s.track}>
          {items.map((t, i) => (
            <span key={i} className={s.chip} aria-hidden={i >= TECH.length ? true : undefined}>
              <span className={s.chipDot} />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
