import { SparkIcon } from '../Icon';
import s from '@/app/(site)/home.module.css';

const BARS: [number, string][] = [[40, 'var(--blue-200)'], [55, 'var(--blue-200)'], [48, 'var(--blue-200)'], [70, 'var(--blue-300)'], [62, 'var(--blue-300)'], [88, 'var(--blue-500)']];

export default function HeroVisual() {
  return (
    <div className={`rise d3 ${s.hv}`} aria-hidden="true">
      <svg className={s.hvLines} width="100%" height="100%" viewBox="0 0 560 520" preserveAspectRatio="none">
        <path className="flow" d="M150 210 C 150 300, 260 300, 300 330" stroke="#1877F2" strokeWidth="1.6" fill="none" opacity="0.55" />
        <path className="flow" d="M430 250 C 470 300, 470 360, 420 390" stroke="#1877F2" strokeWidth="1.6" fill="none" opacity="0.55" />
      </svg>

      <div className={`float1 ${s.win}`}>
        <div className={s.winBar}>
          <span className={s.winDot} /><span className={s.winDot} /><span className={s.winDot} />
          <span className={s.winUrl}>app.yourbusiness.co.za</span>
        </div>
        <div className={s.winBody}>
          <div className={s.side}>
            <div style={{ height: 10, borderRadius: 4, background: 'var(--blue-500)', width: '70%' }} />
            <div className={s.skel} />
            <div className={s.skel} style={{ width: '80%' }} />
            <div className={s.skel} style={{ width: '60%' }} />
          </div>
          <div className={s.main}>
            <div className={s.stats}>
              <div className={`${s.stat} ${s.statOn}`}><div className={s.statK} /><div className={s.statV} style={{ width: '70%' }} /></div>
              <div className={s.stat}><div className={s.statK} /><div className={s.statV} style={{ width: '60%' }} /></div>
              <div className={s.stat}><div className={s.statK} /><div className={s.statV} style={{ width: '40%' }} /></div>
            </div>
            <div className={s.chart}>
              {BARS.map(([h, c], i) => (
                <div key={i} className={s.bar} style={{ height: `${h}%`, background: c }} />
              ))}
            </div>
            <div className={s.skel} style={{ width: '90%' }} />
            <div className={s.skel} style={{ width: '70%' }} />
          </div>
        </div>
      </div>

      <div className={`float2 ${s.term}`}>
        <div className={s.termHead}><span>api — zsh</span><span>backend</span></div>
        <div className={s.termBody}>
          <div><span className={s.prompt}>$</span> <span className={`${s.type} ${s.t1}`} style={{ width: '22ch' }}>git push origin main</span></div>
          <div><span className={s.prompt}>✓</span> <span className={`${s.type} ${s.t2}`} style={{ width: '24ch', color: '#9FB0CC' }}>tests passed · build ok</span></div>
          <div>
            <span className={s.prompt}>→</span> <span className={`${s.type} ${s.t3}`} style={{ width: '26ch', color: '#fff' }}>deployed to production</span>
            <span className={`caret ${s.termCaret}`} />
          </div>
        </div>
      </div>

      <div className={`float3 ${s.ai}`}>
        <div className={s.aiHead}>
          <span className={s.aiBadge}><SparkIcon /></span>
          <span className={s.aiName}>AI assistant</span>
        </div>
        <div className={s.msgQ}>Which invoices are overdue this week?</div>
        <div className={s.msgA}>Pulled from your system — here&apos;s the list, sorted by amount.</div>
      </div>
    </div>
  );
}
