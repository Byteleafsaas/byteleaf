import s from '@/components/booking-admin/booking.module.css';

// Shown while the week loads (HANDOFF-WHATSAPP §8, demo-loading).
export default function Loading() {
  return (
    <div className={s.page}>
      <div className={s.calHeader}><h1 className={s.h1} style={{ fontSize: 24 }}>Calendar</h1></div>
      <div className={s.calPad}>
        <div className={s.panel} aria-busy="true" aria-label="Loading calendar" style={{ padding: 16, display: 'grid', gridTemplateColumns: '56px repeat(3, 1fr)', gap: 10, height: 640, boxSizing: 'border-box' }}>
          <span /><span className={s.skel} style={{ height: 28 }} /><span className={s.skel} style={{ height: 28 }} /><span className={s.skel} style={{ height: 28 }} />
          <span /><span className={s.skel} style={{ height: 220 }} /><span className={s.skel} style={{ height: 120, marginTop: 60 }} /><span className={s.skel} style={{ height: 90 }} />
          <span /><span className={s.skel} style={{ height: 140 }} /><span className={s.skel} style={{ height: 200 }} /><span className={s.skel} style={{ height: 160, marginTop: 40 }} />
        </div>
      </div>
    </div>
  );
}
