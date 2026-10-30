import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { AiIcon, CheckIcon, PlusIcon } from '@/components/Icon';
import { ENDPOINTS, FAQS, MODELS, SERVICE_LISTS } from '@/lib/content';
import { getSite } from '@/lib/server/public';
import s from './services.module.css';

export const metadata: Metadata = {
  title: 'byteleaf — Services',
  description: 'We design, build, fix and maintain — and plug AI into the systems you already rely on.',
};

function Checks({ items, size = 20 }: { items: string[]; size?: number }) {
  return (
    <ul className={`checks ${s.list}`}>
      {items.map((i) => (
        <li key={i}>
          <CheckIcon size={size} />
          {i}
        </li>
      ))}
    </ul>
  );
}

export default async function Services() {
  const { prices } = await getSite();
  // Prices come from Settings › Prices. A blank price shows "Let’s talk"; the included-hours line fills the [X] placeholder.
  const models = MODELS.map((m) => {
    const p = prices[m.tag.toLowerCase() as 'care' | 'build' | 'fix' | 'team'];
    return {
      ...m,
      price: p?.text || 'Let’s talk',
      unit: p?.unit || m.unit,
      items: m.items.map((i) => (i.startsWith('[X] hours') ? (prices.includedHours ? `${prices.includedHours} hours of changes a month` : i) : i)),
    };
  });
  return (
    <main>
      <section className={`gridpaper ${s.hero}`}>
        <div className={s.heroFade} aria-hidden="true" />
        <div className={s.heroIn}>
          <span className="rise eyebrow">SERVICES</span>
          <h1 className="rise d1 h1">Everything your software needs, from <span className="hl">one team.</span></h1>
          <p className="rise d2 lead">We design, build, fix and maintain — and plug AI into the systems you already rely on.</p>
          <div className={`rise d3 ${s.chips}`}>
            <a className={s.chip} href="#design">Design</a>
            <a className={s.chip} href="#frontend">Frontend</a>
            <a className={s.chip} href="#backend">Backend</a>
            <a className={s.chip} href="#ai">AI integrations</a>
            <a className={s.chip} href="#models">Ways to work</a>
          </div>
        </div>
      </section>

      <section id="design" className="sec-72">
        <div className={s.row}>
          <div className={s.text}>
            <span className="eyebrow eyebrow-plain">01 / Design</span>
            <h2 className="h2-sub" style={{ textWrap: 'initial' }}>Interfaces your people actually enjoy using.</h2>
            <p>We start from how your staff and customers work today, then design screens that remove steps instead of adding them.</p>
            <Checks items={SERVICE_LISTS.design} />
          </div>
          <div className={`${s.panel} ${s.pDesign}`} aria-hidden="true">
            <div className={`${s.cardW} ${s.specimen}`}>
              <span className={s.aa}>Aa</span>
              <span className={s.specMeta}>Display 600<br />Body 400<br />Mono 500</span>
            </div>
            <div className={`${s.cardW} ${s.swatches}`}>
              <span style={{ background: '#1877F2' }} /><span style={{ background: '#0B4FB3' }} /><span style={{ background: '#0B1220' }} /><span style={{ background: '#CFE0FB' }} />
            </div>
            <div className={`${s.cardW} ${s.btnsCard}`}>
              <span style={{ background: 'var(--blue-600)' }} />
              <span style={{ border: '1px solid var(--line-2)' }} />
            </div>
          </div>
        </div>
      </section>

      <section id="frontend" className="sec-72">
        <div className={s.row}>
          <div className={`${s.panel} ${s.panelFirst} ${s.pCode}`} aria-hidden="true">
            <div className={s.tabs}><span className={s.tabOn}>Dashboard.tsx</span><span>api.ts</span></div>
            <pre className={s.code}>
              <span className={s.kw}>export function</span> <span className={s.fn}>Dashboard</span>() {'{'}
              {'\n  '}<span className={s.kw}>const</span> orders = useOrders()
              {'\n  '}<span className={s.kw}>return</span> (
              {'\n    <'}<span className={s.tag}>Layout</span>{'>'}
              {'\n      <'}<span className={s.tag}>Stats</span>{' data={orders} />'}
              {'\n      <'}<span className={s.tag}>OrderTable</span>{' rows={orders} />'}
              {'\n    </'}<span className={s.tag}>Layout</span>{'>'}
              {'\n  )'}<span className={`caret ${s.codeCaret}`} />
              {'\n}'}
            </pre>
          </div>
          <div className={s.text}>
            <span className="eyebrow eyebrow-plain">02 / Frontend</span>
            <h2 className="h2-sub" style={{ textWrap: 'initial' }}>Fast, accessible web apps built to last.</h2>
            <p>Customer portals, internal dashboards, booking flows and storefronts — written in clean, typed code your next developer will thank you for.</p>
            <Checks items={SERVICE_LISTS.frontend} />
          </div>
        </div>
      </section>

      <section id="backend" className="sec-72">
        <div className={s.row}>
          <div className={s.text}>
            <span className="eyebrow eyebrow-plain">03 / Backend</span>
            <h2 className="h2-sub" style={{ textWrap: 'initial' }}>The engine room, kept running smoothly.</h2>
            <p>APIs, databases and integrations that connect your tools — accounting, payments, CRMs, ERPs — with monitoring so we hear about problems before your customers do.</p>
            <Checks items={SERVICE_LISTS.backend} />
          </div>
          <div className={`${s.panel} ${s.pApi}`} aria-hidden="true">
            {ENDPOINTS.map((e) => (
              <div key={e.p} className={s.ep}>
                <span className={s.epM} style={{ color: e.color }}>{e.m}</span>
                <span className={s.epP}>{e.p}</span>
                <span className={s.epS}><span className={`pulse ${s.epDot}`} />200</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ai" className={`sec-72 ${s.lastRow}`}>
        <div className={s.row}>
          <div className={`${s.panel} ${s.panelFirst} ${s.pAi}`} aria-hidden="true">
            <div className={s.aiDots} />
            <div className={s.aiGrid}>
              <div className={s.aiCol}>
                <span className={s.aiLabel}>YOUR DATA</span>
                <span className={s.dataChip}>invoices.pdf</span>
                <span className={s.dataChip}>crm_records</span>
                <span className={s.dataChip}>policies.docx</span>
              </div>
              <div className={s.core}>
                <span className={`pulse ${s.coreBox}`}><AiIcon size={40} stroke="#fff" /></span>
              </div>
              <div className={s.aiCol}>
                <span className={s.aiLabel}>YOUR APP</span>
                <span className={`${s.outChip} ${s.outOn}`}>Answers</span>
                <span className={s.outChip}>Summaries</span>
                <span className={s.outChip}>Auto-filled forms</span>
              </div>
            </div>
            <svg className={s.aiLine} width="100%" height="40" viewBox="0 0 400 40" preserveAspectRatio="none">
              <path className="flow" style={{ animationDuration: '2s' }} d="M0 20 H400" stroke="#1877F2" strokeWidth="2" />
            </svg>
          </div>
          <div className={s.text}>
            <span className="eyebrow eyebrow-plain">04 / AI integrations</span>
            <h2 className="h2-sub" style={{ textWrap: 'initial' }}>AI that does real work inside your business.</h2>
            <p>No hype — just useful features wired into the systems you already use, with your data kept under your control.</p>
            <Checks items={SERVICE_LISTS.ai} />
          </div>
        </div>
      </section>

      <section id="models" className={s.models}>
        <div className={s.modelsIn}>
          <div className={s.modelsHead}>
            <span className="eyebrow">WAYS TO WORK WITH US</span>
            <h2 className="h2">Pick the arrangement that fits.</h2>
          </div>
          <div className={s.modelGrid}>
            {models.map((m) => (
              <article key={m.tag} className={`card ${s.model}`}>
                <span className={s.mTag}>{m.tag}</span>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
                <div className={s.price}>
                  <strong>{m.price}</strong>
                  <span>{m.unit}</span>
                </div>
                <ul className={`checks ${s.mItems}`}>
                  {m.items.map((i) => (
                    <li key={i}>
                      <CheckIcon size={18} />
                      {i}
                    </li>
                  ))}
                </ul>
                <Link className="btn btn-ghost" href="/book">Talk to us</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className={s.faqGrid}>
          <div className={s.faqHead}>
            <span className="eyebrow">FAQ</span>
            <h2 className="h2-sub">Questions we hear a lot</h2>
            <p>Something else on your mind? <Link href="/contact">Ask us directly.</Link></p>
          </div>
          <div className={s.faqList}>
            {FAQS.map((f) => (
              <details key={f.q} className={s.faq}>
                <summary>
                  {f.q}
                  <PlusIcon className={s.plus} stroke="var(--blue-600)" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Not sure which fits?" text="A 30-minute call is usually enough to point you in the right direction." />
      <Footer />
    </main>
  );
}
