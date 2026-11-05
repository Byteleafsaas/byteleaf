'use client';

import { useEffect, useRef, useState } from 'react';
import { FLOWS, init, script, settle, tap, type FlowKey, type Msg, type Owner, type Story } from '@/lib/whatsapp/story';
import s from './demo.module.css';

type Sheet = { title: string; rows: [string, string][] } | null;

const segs = (line: string) => line.split('*').map((t, i) => ({ t, bold: i % 2 === 1 })).filter((x) => x.t);

// The owner's calendar is drawn at 44px an hour from 08:00.
const Y = (h: number, m = 0) => Math.round((((h - 8) * 60 + m) * 44) / 60);
type Block = { y: number; h: number; time: string; name: string; svc: string; style: React.CSSProperties; fresh?: boolean; tag?: { t: string; style: React.CSSProperties } };
const pad = (n: number) => String(n).padStart(2, '0');
const B = (h1: number, m1: number, h2: number, m2: number, name: string, svc: string, kind: 'ok' | 'un' = 'ok', extra: Partial<Block> = {}): Block => ({
  y: Y(h1, m1) + 2, h: Y(h2, m2) - Y(h1, m1) - 4, time: `${pad(h1)}:${pad(m1)}–${pad(h2)}:${pad(m2)}`, name, svc,
  style: kind === 'un' ? { background: '#fff', border: '1.5px dashed #6B7891' } : { background: '#F7ECF5', boxShadow: 'inset 3px 0 0 #8B2F7E' }, ...extra,
});
const WARN = { background: '#FFF4E0', color: '#8A5200' };
const NEWTAG = { background: '#8B2F7E', color: '#fff' };

function calendar(flow: FlowKey, o: Owner): { title: string; cols: { h: string; blocks: Block[] }[] } {
  if (flow === 'book') {
    const lerato = [B(12, 15, 16, 0, 'Tumi Radebe', 'Knotless (short)')];
    if (o.held) lerato.push(B(8, 0, 12, 0, 'Lindiwe Dube', 'Knotless braids', 'un', { fresh: true, tag: { t: 'Held · confirming', style: WARN } }));
    if (o.booked) lerato.push(B(8, 0, 12, 0, 'Lindiwe Dube', 'Knotless braids', 'ok', { fresh: true, tag: { t: 'New · WhatsApp', style: NEWTAG } }));
    return { title: 'Saturday 7 November', cols: [
      { h: 'Lerato', blocks: lerato },
      { h: 'Thandeka', blocks: [B(8, 0, 12, 0, 'Nandi Shabalala', 'Knotless braids'), B(12, 15, 14, 15, 'Ofentse Moloi', "Kids' braids", 'un', { tag: { t: 'Unconfirmed', style: WARN } })] },
      { h: 'Naledi', blocks: [B(9, 0, 10, 30, 'Khanyi Zwane', 'Silk press'), B(10, 30, 12, 0, 'Dineo Maseko', 'Silk press'), B(13, 0, 14, 0, 'Palesa Dlamini', 'Gel nails')] },
    ] };
  }
  const sat = [B(12, 15, 16, 0, 'Tumi Radebe', 'Knotless (short)')];
  const tue = [B(15, 0, 16, 0, 'Mpho Sithole', 'Gel nails')];
  if (!o.moved) sat.push(B(8, 0, 12, 0, 'Lindiwe Dube', 'Knotless braids', 'un', { tag: { t: 'Reminder sent', style: WARN } }));
  else {
    sat.push(B(8, 0, 12, 0, 'Moved to Tue 10:30', 'Time is free again', 'un', { style: { background: 'repeating-linear-gradient(135deg,#EEF2F8 0 6px,#F8FAFD 6px 12px)', color: '#4B5872' } }));
    tue.push(B(10, 30, 14, 30, 'Lindiwe Dube', 'Knotless braids', 'ok', { fresh: true, tag: { t: 'Moved by client', style: NEWTAG } }));
  }
  return { title: 'Lerato · two days', cols: [{ h: 'Sat 7 Nov', blocks: sat }, { h: 'Tue 10 Nov', blocks: tue }] };
}

const OWNER_TEXT: Record<FlowKey, [string, string]> = {
  book: ['A booking lands in the calendar', 'The time is held while she confirms, so nobody else can take it. Then it appears as a WhatsApp booking.'],
  move: ['The booking moves itself', 'She replies to the reminder and picks a new time. The old slot frees up for others straight away.'],
  person: ['Anyone can step in, and step out', 'When a client asks for a person, the chat is flagged and the assistant pauses. Take over, reply, then hand back.'],
};
const DONE: Record<FlowKey, [string, string]> = {
  book: ['Booked in four taps.', 'No typing, no back-and-forth, and the diary is already up to date.'],
  move: ['Moved without a phone call.', 'Lerato didn’t have to do anything.'],
  person: ['Back to the assistant.', 'The client was never stuck with a bot.'],
};

export default function StoryDemo() {
  const [story, setStory] = useState<Story>(() => init('book'));
  const [typing, setTyping] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [hint, setHint] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const log = useRef<HTMLDivElement>(null);
  const live = useRef(story);
  live.current = story;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [story.msgs.length, typing]);

  const reset = (flow: FlowKey) => { timers.current.forEach(clearTimeout); timers.current = []; setStory(init(flow)); setTyping(false); setSheet(null); setHint(false); };

  const press = (label: string) => {
    const r = tap(story, label);
    if (r.kind === 'hint') { setHint(true); return; }
    setHint(false); setSheet(null); setStory(r.story); setTyping(r.typing);
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const done = () => { setTyping(false); setStory((cur) => settle(cur, r.next)); };
    if (reduce || label.startsWith('owner:')) done(); else timers.current.push(setTimeout(done, 700));
  };

  const flow = story.flow;
  const sc = script(flow);
  const cur = sc[story.step];
  const expect = cur?.expect ?? null;
  const o = story.owner;
  const last = story.msgs.length - 1;
  const total = sc.length - 1;
  const finished = !expect && !typing;
  const fi = FLOWS.findIndex((f) => f.key === flow);
  const cal = flow !== 'person' ? calendar(flow, o) : null;
  const ex = expect ?? '';
  const clock = flow === 'move' ? '18:00' : flow === 'person' ? '10:41' : '09:12';

  const strip: [string, React.CSSProperties] = o.back ? ['Assistant is answering', { background: '#E6F6EF', color: '#0B4D36' }] : o.taken ? ['You’re replying · assistant paused', { background: '#F7ECF5', color: '#5E1F55' }] : o.flag ? ['Lindiwe asked for a person · assistant paused', { background: '#FEF3F2', color: '#912018' }] : ['Assistant is answering', { background: '#F4F7FB', color: '#33405A' }];
  const thread = [{ who: 'Lindiwe', t: 'hi can I get shorter braids? not sure which one to pick', me: true, st: { background: '#DCE6F4' } }, { who: 'Assistant', t: "Sorry, I didn't quite understand that…", me: false, st: { background: '#EEF2F8' } }] as { who: string; t: string; me: boolean; st: React.CSSProperties }[];
  if (o.flag) thread.push({ who: 'Assistant', t: "Sure. I've asked the team to reply here…", me: false, st: { background: '#EEF2F8' } });
  if (o.sent) thread.push({ who: 'You (Lerato)', t: 'Hi Lindiwe, Lerato here. Yes, I can do a shorter knotless style…', me: false, st: { background: '#F7ECF5', border: '1px solid #E8C9E2' } });
  if (o.back) thread.push({ who: 'Assistant', t: 'Lerato has handed you back to the booking assistant…', me: false, st: { background: '#EEF2F8' } });

  const renderBot = (m: Msg, i: number) => {
    const isLive = i === last && !typing;
    return (
      <div key={i} style={{ display: 'contents' }}>
        <div className={`${s.bub} ${m.staff ? s.staff : s.biz}`}>
          {m.staff && <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7A2470', marginBottom: 2 }}>Lerato · salon</span>}
          {m.tpl && <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.06em', color: '#6B7891', marginBottom: 3 }}>REMINDER</span>}
          {m.text.split('\n').map((l, li) => <span key={li} className={s.line}>{segs(l).map((x, xi) => <span key={xi} style={x.bold ? { fontWeight: 600 } : undefined}>{x.t}</span>)}</span>)}
          {m.foot && <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: '#6B7891' }}>{m.foot}</span>}
          <span className={s.tm}>{m.time}</span>
        </div>
        {m.btns && (
          <div className={s.rbs}>{m.btns.map((b) => <button key={b} type="button" className={`${s.rb} ${isLive && b === expect ? s.go : ''}`} disabled={!isLive} onClick={() => press(b)}>{b}</button>)}</div>
        )}
        {m.list && m.rows && (
          <div className={s.rbs}>
            <button type="button" className={`${s.rb} ${isLive && m.rows.some((r) => r[0] === expect) ? s.go : ''}`} disabled={!isLive} onClick={() => setSheet({ title: m.list!, rows: m.rows! })}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>{m.list}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={s.mainIn}>
      <div className={s.bar}>
        <div role="tablist" aria-label="Choose a story" className={s.tabs}>
          {FLOWS.map((f) => <button key={f.key} type="button" role="tab" className={s.ftab} aria-selected={flow === f.key} onClick={() => reset(f.key)}><span className={s.n} aria-hidden="true">{f.n}</span>{f.label}</button>)}
        </div>
        <div className={s.ctl}>
          <span className={s.stepLabel} role="status">{finished ? `Done · ${total} of ${total}` : `Step ${story.step + 1} of ${total}`}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => reset(flow)}>Restart</button>
          <button type="button" className={`btn btn-primary btn-sm ${!expect || typing ? s.btnOff : ''}`} disabled={!expect || typing} onClick={() => expect && press(expect)}>{expect?.startsWith('owner:') ? 'Next: owner’s turn' : 'Next step'}</button>
        </div>
      </div>

      <div className={s.stage}>
        <div className={s.phoneCol}>
          <div className={s.phone} role="region" aria-label="Client’s phone (demo)">
            <div className={s.scr}>
              <div className={s.status} aria-hidden="true"><span>{clock}</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>5G ▪▪▪</span></div>
              <div className={s.chatHead}>
                <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', background: '#8B2F7E', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15 }}>L</span>
                <span className={s.chatName}><b>Lerato’s Braids &amp; Beauty</b><span>Booking assistant · automated</span></span>
              </div>
              <div ref={log} className={s.log} role="log" aria-live="polite" aria-label="Chat">
                <span className={s.day}>{flow === 'move' ? 'FRIDAY' : 'TODAY'}</span>
                {story.msgs.map((m, i) => m.me ? <div key={i} className={`${s.bub} ${s.me}`}>{m.text}<span className={s.tm}>{m.time}</span></div> : renderBot(m, i))}
                {typing && <div role="status" aria-label="Typing" className={s.typing}><span className={s.dot} /><span className={s.dot} /><span className={s.dot} /></div>}
              </div>
              <div className={s.composer}>
                <span className={s.field}>Tap the options above</span>
                <span aria-hidden="true" className={s.send}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
              </div>
              {sheet && (
                <>
                  <div className={s.scrimIn} onClick={() => setSheet(null)} />
                  <div className={s.sheet} role="dialog" aria-modal="true" aria-label={sheet.title}>
                    <div className={s.sheetHead}><span>{sheet.title}</span><button type="button" onClick={() => setSheet(null)} aria-label="Close list"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
                    <div className={s.sheetBody}>{sheet.rows.map((r) => <button key={r[0]} type="button" className={`${s.srow} ${r[0] === expect ? s.srowGo : ''}`} onClick={() => press(r[0])}><span className={s.rowText}><span>{r[0]}</span><span>{r[1]}</span></span><span className={s.radio} aria-hidden="true" /></button>)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
          {hint && <p role="status" className={s.hintP}>This demo follows one path. Tap the highlighted option.</p>}
        </div>

        <div className={s.owner}>
          <div className={s.ownerHead}><span className={s.k}>WHAT THE OWNER SEES</span><h2>{OWNER_TEXT[flow][0]}</h2><p>{OWNER_TEXT[flow][1]}</p></div>
          {o.ntf && <div className={s.ntf} role="status"><span aria-hidden="true" className={s.ic}>L</span><span style={{ flex: 1 }}>{o.ntf}</span><span className={s.now}>now</span></div>}

          {cal && (
            <div className={s.card}>
              <div className={s.calHead}><span aria-hidden="true" className={s.mark}>L</span><strong>Calendar</strong><span className={s.ct}>{cal.title}</span></div>
              <div className={s.cols}><span />{cal.cols.map((c) => <span key={c.h}>{c.h}</span>)}</div>
              <div className={s.grid}>
                <div aria-hidden="true" className={s.hours}>{[8, 9, 10, 11, 12, 13, 14, 15].map((h) => <span key={h} style={{ top: Y(h) + 2 }}>{pad(h)}:00</span>)}</div>
                {cal.cols.map((c) => (
                  <div key={c.h} role="list" aria-label={c.h} className={s.col}>
                    {c.blocks.map((b, i) => (
                      <div key={`${b.time}${b.name}${i}`} role="listitem" className={`${s.blk} ${b.fresh ? s.blkNew : ''}`} style={{ top: b.y, height: b.h, ...b.style }}>
                        <span className={s.t}>{b.time}</span><strong>{b.name}</strong><span className={s.s}>{b.svc}</span>
                        {b.tag && <span className={s.tag} style={b.tag.style}>{b.tag.t}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {flow === 'person' && (
            <div className={`${s.card} ${s.inbox}`}>
              <div className={s.chats}>
                <div className={s.h}>Inbox</div>
                {[{ n: 'Lindiwe Dube', t: '10:41', p: o.sent ? 'You: Hi Lindiwe, Lerato here…' : 'hi can I get shorter braids?', flag: o.flag && !o.back, bg: '#F7ECF5' }, { n: 'Ayanda Nkosi', t: '09:55', p: 'Booked: Silk press, Fri 14:00', flag: false, bg: '' }, { n: 'Karabo Molefe', t: '08:12', p: 'Thanks, see you tomorrow!', flag: false, bg: '' }].map((c) => (
                  <div key={c.n} className={s.chatRow} style={c.bg ? { background: c.bg } : undefined}>
                    <span className={s.top}><strong>{c.n}</strong><span className={s.ti}>{c.t}</span></span>
                    <span className={s.pv}>{c.p}</span>
                    {c.flag && <span className={s.flag}>ASKED FOR A PERSON</span>}
                  </div>
                ))}
              </div>
              <div className={s.thread}>
                <div className={s.threadHead}><strong>Lindiwe Dube</strong><span className={s.chip}>REPLY WINDOW · 23 H LEFT</span></div>
                <div role="status" className={s.strip} style={strip[1]}>{strip[0]}</div>
                <div className={s.msgs}>{thread.map((m, i) => <div key={i} className={s.m} style={{ alignSelf: m.me ? 'flex-end' : 'flex-start' }}><span className={s.who} style={{ textAlign: m.me ? 'right' : 'left' }}>{m.who}</span><span className={s.tx} style={m.st}>{m.t}</span></div>)}</div>
                <div className={s.actions}>
                  {ex === 'owner:take' && <><button type="button" className={`${s.obtn} ${s.obtnGo}`} onClick={() => press('owner:take')}>Take over</button><span className={s.muted12}>Pauses the assistant for this chat</span></>}
                  {ex === 'owner:send' && <><span className={s.draft}>Hi Lindiwe, Lerato here. Yes, I can do a shorter knotless style…</span><button type="button" className={`${s.obtn} ${s.obtnGo}`} onClick={() => press('owner:send')}>Send</button></>}
                  {ex === 'owner:back' && <button type="button" className={`${s.obtn} ${s.obtnGo}`} onClick={() => press('owner:back')}>Hand back to assistant</button>}
                  {o.back && <span style={{ fontSize: 13, color: '#0B6B4B', fontWeight: 500 }}>Assistant is answering again.</span>}
                  {!o.flag && !o.back && !typing && ex === 'Ask a person' && <span style={{ fontSize: 13, color: '#4B5872' }}>The assistant is handling this chat.</span>}
                </div>
              </div>
            </div>
          )}

          {finished && (
            <div className={s.done} role="status">
              <span><strong>{DONE[flow][0]}</strong> {DONE[flow][1]}</span>
              {fi < 2 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => reset(FLOWS[fi + 1].key)}>Next: {FLOWS[fi + 1].label}</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
