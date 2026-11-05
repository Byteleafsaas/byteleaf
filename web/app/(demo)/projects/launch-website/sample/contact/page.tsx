import type { Metadata } from 'next';
import { blockValue, closedLine, hasRealWhatsApp, hoursLine, telHref, waLink } from '@/lib/launch/site';
import { getLive } from '@/lib/server/launch/store';
import EnquiryForm from './EnquiryForm';
import s from '../site.module.css';

export const metadata: Metadata = { title: 'Contact and booking' };
export const dynamic = 'force-dynamic';

export default async function Contact() {
  const live = await getLive();
  const biz = live.settings;
  const tel = telHref(biz.phone);
  const wa = waLink(biz);
  return (
    <section style={{ padding: '56px 0 64px' }}>
      <div className={s.wrap} style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
        <div className={s.col} style={{ flex: '1 1 300px', gap: 18 }}>
          <span className={s.tag}>Contact and booking</span>
          <h1 className={s.pageH54}>{blockValue(live, 'contact', 'c1')}</h1>
          <p className={s.lead}>{blockValue(live, 'contact', 'c2')}</p>
          <a className={`${s.b} ${s.bSun}`} href={wa} style={{ alignSelf: 'flex-start' }} {...(hasRealWhatsApp(biz) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>Message us on WhatsApp</a>
          <dl style={{ margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><dt style={{ fontWeight: 600 }}>Phone</dt><dd style={{ margin: 0 }}>{tel ? <a href={tel}>{biz.phone}</a> : biz.phone}</dd></div>
            <div><dt style={{ fontWeight: 600 }}>Hours</dt><dd style={{ margin: 0 }}>{hoursLine(biz.hours)}<br /><span className={s.muted}>{closedLine(biz.hours)}</span></dd></div>
            {biz.areas.length > 0 && <div><dt style={{ fontWeight: 600 }}>Areas</dt><dd style={{ margin: 0 }}>{biz.areas.join(', ')}</dd></div>}
          </dl>
        </div>
        <div style={{ flex: '1.4 1 420px', minWidth: 0 }}>
          <EnquiryForm areas={biz.areas} washes={live.services.filter((x) => x.visible).map((x) => x.name)} afterText={blockValue(live, 'contact', 'c3')} />
        </div>
      </div>
    </section>
  );
}
