'use client';

import { useReducer, type ReactNode } from 'react';
import { SHOWCASE as C } from '@/lib/launch/showcase-copy';
import { SCRIPT, STORY_ORDER, currentScreen, initial, nextStory, reducer, type Screen, type StoryKey } from '@/lib/launch/showcase';
import s from './launch.module.css';

const STORY_NO = Object.fromEntries(STORY_ORDER.map((k, i) => [k, i + 1])) as Record<StoryKey, number>;
const SERVICES = [['Express wash', 'Hand wash and dry, outside', 45, 'R 150'], ['Full wash and vacuum', 'Inside and out', 90, 'R 250'], ['Interior deep clean', 'Seats, carpets, trim', 120, 'R 480'], ['Polish and wax', 'Clay bar, machine polish', 120, 'R 650']] as const;

type Ctx = { target: string | null; tap: (t: string) => void; off: () => void; price: number; added: boolean; story: boolean };

function Hot({ id, ctx, className, children, label }: { id: string; ctx: Ctx; className: string; children: ReactNode; label?: string }) {
  const go = ctx.target === id;
  return <button type="button" className={`${className} ${go ? s.go : ''}`} aria-label={label} onClick={() => ctx.tap(id)}>{children}</button>;
}
const Dead = ({ ctx, className, children }: { ctx: Ctx; className: string; children: ReactNode }) => <button type="button" className={className} onClick={ctx.off}>{children}</button>;

function Site({ screen, ctx, phone }: { screen: Screen; ctx: Ctx; phone: boolean }) {
  const rows = SERVICES.map(([n, d, , p], i) => ({ n, d, p: i === 1 && ctx.price !== 250 ? `R ${ctx.price}` : p, flash: i === 1 && ctx.price !== 250 && screen === 'services' }));
  return (
    <div className={`${s.site} ${phone ? s.sitePhone : ''}`}>
      <div className={s.siteBar}><span className={s.logo}>tsela<i>.</i></span><Dead ctx={ctx} className={s.menu}>Menu</Dead></div>
      {screen === 'home' && (
        <div className={s.pad}>
          <span className={s.tag}>MOBILE CAR WASH · PRETORIA</span>
          <h3 className={s.sh}>A spotless car, washed in your driveway.</h3>
          <p className={s.sp}>We come to your home or office, bring our own water and power.</p>
          <span className={s.row}><Hot id="book" ctx={ctx} className={s.sun}>Book a wash</Hot><Dead ctx={ctx} className={s.line}>WhatsApp us</Dead></span>
        </div>
      )}
      {screen === 'contact' && (
        <div className={s.pad}>
          <h3 className={s.sh}>Book a wash</h3>
          {['Your name · Thandi', 'Cell number · 082 555 0123', 'Area · Hatfield', 'Wash · Full wash and vacuum'].map((f) => <span key={f} className={s.fld}>{f}</span>)}
          <Hot id="send" ctx={ctx} className={s.sun}>Send request</Hot>
        </div>
      )}
      {screen === 'sent' && (
        <div className={s.pad}>
          <span className={s.okDot} aria-hidden="true">✓</span>
          <h3 className={s.sh}>Thanks, Thandi. We got it.</h3>
          <p className={s.sp}>We’ll confirm your wash on WhatsApp within [reply time].</p>
        </div>
      )}
      {screen === 'services' && (
        <div className={s.pad}>
          <h3 className={s.sh}>Services and prices</h3>
          {rows.map((r) => <span key={r.n} className={`${s.srv} ${r.flash ? s.flash : ''}`}><span><b>{r.n}</b><br /><small>{r.flash ? 'Updated just now' : r.d}</small></span><b>{r.p}</b></span>)}
        </div>
      )}
      {screen === 'gallery' && (
        <div className={s.pad}>
          <h3 className={s.sh}>Our work</h3>
          <div className={s.grid}>{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className={`${s.tile} ${i < 3 ? s.flash : ''}`} style={{ background: i < 3 ? '#2F7D55' : '#9DB8A8' }}>{i < 3 ? 'Photo' : 'Sample'}</span>)}</div>
        </div>
      )}
    </div>
  );
}

function Admin({ screen, ctx }: { screen: Screen; ctx: Ctx }) {
  const pending = screen === 'listPub' || screen === 'photosAdded';
  const title = { enquiries: 'Enquiries', list: 'Services & prices', editor: 'Services & prices', listPub: 'Services & prices', photosEmpty: 'Photos', photosAdded: 'Photos' }[screen as 'list'];
  return (
    <div className={s.admin}>
      <aside className={s.side} aria-hidden="true">
        <b>Tsela</b>{['Overview', 'Pages', 'Services & prices', 'Photos', 'Enquiries', 'Site settings'].map((x) => <span key={x} className={x === title ? s.sideOn : ''}>{x}</span>)}
      </aside>
      <div className={s.adminMain}>
        <div className={s.adminHead}><h3>{title}</h3>{screen.startsWith('photos') && <Hot id="upload" ctx={ctx} className={s.btnB}>Upload photos</Hot>}</div>
        {(screen === 'list' || screen === 'editor' || screen === 'listPub') && (
          <div className={s.adminBody}>
            <div className={s.tbl}>
              {SERVICES.map(([n, , , p], i) => {
                const price = i === 1 ? (screen === 'list' ? 'R 250' : `R ${ctx.price}`) : p;
                const content = <><span><b>{n}</b></span><span>{price}</span>{i === 1 && screen === 'listPub' && <em className={s.draftPill}>NOT PUBLISHED</em>}</>;
                return i === 1 ? <Hot key={n} id="row" ctx={ctx} className={s.trow}>{content}</Hot> : <Dead key={n} ctx={ctx} className={s.trow}>{content}</Dead>;
              })}
            </div>
            {screen === 'editor' && (
              <div className={s.editor}>
                <b>Full wash and vacuum</b>
                <span className={s.lbl}>Price (R)</span><span className={s.fld}>{ctx.price}</span>
                <Hot id="save" ctx={ctx} className={s.btnB}>Save</Hot>
              </div>
            )}
          </div>
        )}
        {screen === 'photosEmpty' && <div className={s.adminBody}><div className={s.drop}><b>No photos yet</b><small>Your gallery shows sample photos until you add some.</small></div></div>}
        {screen === 'photosAdded' && <div className={s.adminBody}><div className={s.grid}>{[1, 2, 3].map((i) => <span key={i} className={s.tile} style={{ background: '#2F7D55' }}>Photo {i}<em className={s.draftPill}>NOT PUBLISHED</em></span>)}</div></div>}
        {screen === 'enquiries' && (
          <div className={s.adminBody}>
            <div className={`${s.enq} ${s.flash}`}><b>Thandi · 082 555 0123 <em className={s.newPill}>NEW</em></b><span>Hatfield · Full wash and vacuum</span><span className={s.row}><Dead ctx={ctx} className={s.btnB}>Reply on WhatsApp</Dead><Dead ctx={ctx} className={s.btnG}>Reply by email</Dead><Dead ctx={ctx} className={s.btnG}>Archive</Dead></span><small>Also sent to [email address]</small></div>
          </div>
        )}
        {pending && <div className={s.pubBar}><span><b>{screen === 'listPub' ? '1 change' : '3 changes'} not published</b></span><Hot id="publish" ctx={ctx} className={s.btnB}>Publish</Hot></div>}
      </div>
    </div>
  );
}

function BrowserFrame({ children, url, label }: { children: ReactNode; url: string; label: string }) {
  return <div className={s.browser} role="img" aria-label={label}><div className={s.chrome}><i /><i /><i /><span>{url}</span></div><div className={s.bView}>{children}</div></div>;
}

export default function Story() {
  const [st, dispatch] = useReducer(reducer, initial);
  const screen = currentScreen(st);
  const target = st.story && !st.finished ? SCRIPT[st.story][st.step].target : null;
  const price = st.story === 'price' && (st.step >= 1) ? 270 : 250;
  const ctx: Ctx = { target, tap: (t) => dispatch({ t: 'tap', target: t }), off: () => dispatch({ t: 'off' }), price, added: st.story === 'photos' && st.step >= 1, story: Boolean(st.story) };
  const copy = st.story ? C.stories[st.story] : null;
  const stepCopy = copy && !st.finished ? copy.steps[st.step] : null;
  const next = st.story ? nextStory(st.story) : null;
  const view = st.view;
  const galleryFilled = st.story === 'photos' && st.step >= 2;
  const siteScreen = screen === 'gallery' && !galleryFilled ? 'home' : screen;

  return (
    <div className={s.stage}>
      <div className={s.top}>
        <div className={s.seg} role="group" aria-label="View">
          {(['site', 'admin'] as const).map((v, i) => <button key={v} type="button" aria-pressed={view === v} className={s.segBtn} onClick={() => dispatch({ t: 'view', view: v })}>{C.views[i]}</button>)}
        </div>
        <div className={s.tabs} role="tablist" aria-label="Stories">
          {STORY_ORDER.map((k) => <button key={k} type="button" role="tab" aria-selected={st.story === k} className={s.tab} onClick={() => dispatch({ t: 'pick', story: k })}><span className={s.n}>{STORY_NO[k]}</span>{C.stories[k].tab}</button>)}
        </div>
      </div>

      {st.story && (
        <div className={s.ctl}>
          <span className={s.counter}>{st.finished ? 'Done' : `Step ${st.step + 1} of ${SCRIPT[st.story].length}`}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ t: 'restart' })}>Restart</button>
          {!st.finished && <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ t: 'next' })}>Next step</button>}
        </div>
      )}

      <div className={s.screens}>
        {view === 'site' ? (
          <>
            <div className={s.browserCol}><BrowserFrame url="tselawash.co.za" label="Drawn browser showing the Tsela Mobile Wash site"><Site screen={siteScreen} ctx={ctx} phone={false} /></BrowserFrame></div>
            <div className={s.phoneCol}><div className={s.phone} role="img" aria-label="Drawn phone showing the same site"><div className={s.phoneIn}><Site screen={siteScreen} ctx={ctx} phone /></div></div></div>
          </>
        ) : (
          <div className={s.browserCol} style={{ flexBasis: '100%' }}><BrowserFrame url="tselawash.co.za/admin" label="Drawn browser showing the owner’s admin"><Admin screen={screen} ctx={ctx} /></BrowserFrame></div>
        )}
      </div>

      <div className={s.caption} role="status" aria-live="polite">
        {st.hint ? <span className={s.hintTxt}>{C.offPathHint}</span>
          : st.finished && copy ? (
            <span className={s.doneBox}><strong>{copy.done}</strong>{next && <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ t: 'pick', story: next })}>Next: {C.stories[next].tab}</button>}</span>
          ) : stepCopy ? stepCopy.caption : C.idleCaption}
      </div>
    </div>
  );
}
