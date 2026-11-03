'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import ListSelect from '@/components/ListSelect';
import { PathIcon } from '@/components/admin/icons';
import { Switch, TopBar } from '@/components/admin/Ui';
import { useAdmin } from '@/lib/admin/store';
import { isHex, onBrand, themeFromBrand } from '@/lib/assistant/contrast';
import { AVATARS, REPLY_TIMES, RETENTION_OPTIONS, TONES, TONE_HELP, settingsSchema, type AssistantSettings } from '@/lib/assistant/settings';
import { saveSettingsAction } from '@/lib/server/actions/assistant-tools';
import a from '@/components/admin/admin.module.css';
import s from './assistant.module.css';
import t from './tools.module.css';

const SWATCHES = ['#166FE5', '#F5A623', '#B4471A', '#0F7B4F', '#0B1220'];
const AVATAR_LABEL = { logo: 'Logo', initial: 'Initial', ai: 'AI badge' } as const;
const SUN = 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4';
const CLOSE = 'M6 6l12 12M18 6L6 18';
const same = (x: AssistantSettings, y: AssistantSettings) => JSON.stringify(x) === JSON.stringify(y);

function Avatar({ kind, name, accent }: { kind: AssistantSettings['avatar']; name: string; accent: string }) {
  if (kind === 'logo') return <span className={t.av} style={{ background: '#E8A317' }} aria-hidden="true"><PathIcon d={SUN} size={20} /></span>;
  if (kind === 'ai') return <span className={t.av} style={{ background: '#0B1220' }} aria-hidden="true">AI</span>;
  return <span className={t.av} style={{ background: accent }} aria-hidden="true">{(name.trim()[0] ?? 'A').toUpperCase()}</span>;
}

export default function SettingsView({ initial }: { initial: AssistantSettings }) {
  const { notify } = useAdmin();
  const router = useRouter();
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(initial);
  const [d, setD] = useState(initial);
  const [topic, setTopic] = useState('');
  const [hex, setHex] = useState(initial.brand);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dirty = !same(saved, d);
  const check = useMemo(() => settingsSchema.safeParse(d), [d]);
  const brandOk = isHex(d.brand);
  const contrast = useMemo(() => (brandOk ? onBrand(d.brand) : null), [d.brand, brandOk]);
  const valid = check.success && (contrast?.passes ?? false);
  const theme = useMemo(() => themeFromBrand(brandOk ? d.brand : saved.brand), [d.brand, brandOk, saved.brand]);

  const set = <K extends keyof AssistantSettings>(k: K, v: AssistantSettings[K]) => { setD((x) => ({ ...x, [k]: v })); setError(''); };
  const setTalk = <K extends keyof AssistantSettings['talk']>(k: K, v: AssistantSettings['talk'][K]) => setD((x) => ({ ...x, talk: { ...x.talk, [k]: v } }));

  // Warn before closing the tab with changes that aren't saved.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // Clicking any link inside the app while there are unsaved changes asks first, so changes aren't lost by accident.
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname + url.search === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  useEffect(() => {
    if (leaveTo === null) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setLeaveTo(null); };
    document.addEventListener('keydown', key);
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    return () => document.removeEventListener('keydown', key);
  }, [leaveTo]);

  const leave = (to: string) => { setD(saved); setLeaveTo(null); router.push(to); };

  const pickColour = (c: string) => { setHex(c); set('brand', c); };
  const typeColour = (v: string) => { const x = v.startsWith('#') ? v : `#${v}`; setHex(v); if (isHex(x)) set('brand', x.toUpperCase()); };
  const addTopic = () => {
    const v = topic.trim();
    if (v.length < 2 || d.refused.some((x) => x.toLowerCase() === v.toLowerCase())) { setTopic(''); return; }
    set('refused', [...d.refused, v]); setTopic('');
  };

  async function save() {
    setBusy(true); setError('');
    const res = await saveSettingsAction(d).catch(() => ({ ok: false as const, error: 'That didn’t save. Check your connection and try again.' }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setSaved(res.settings); setD(res.settings); setHex(res.settings.brand);
    notify('Settings saved. The chat uses them straight away.');
  }

  const pv = { '--pv-accent': theme.accent, '--pv-on': theme.onAccent, '--pv-soft': theme.accentSoft } as CSSProperties;
  const problem = !check.success ? check.error.issues[0]?.message : contrast && !contrast.passes ? 'That colour can’t be read with white or dark text. Choose a stronger or paler one.' : '';

  return (
    <>
      <TopBar crumb="Khumalo Home Solar / Knowledge" title="Assistant settings">
        <button type="button" className={`${a.btn} ${a.btnPrimary}`} disabled={!dirty || !valid || busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
      </TopBar>

      <div className={s.page}>
        {(error || (dirty && problem)) && <div className={s.err} role="alert"><PathIcon d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" size={18} /><span>{error || problem}</span></div>}

        <div className={t.setGrid}>
          <div className={`${a.panel} ${t.setMain}`}>
            <section className={t.sec} aria-labelledby="s1">
              <h2 id="s1">Name and greeting</h2>
              <div className={t.fld}>
                <label htmlFor="st-name">Assistant name</label>
                <input id="st-name" className={a.field} type="text" maxLength={60} value={d.name} onChange={(e) => set('name', e.target.value)} />
                <span className={t.hint}>Shown in the chat header. Customers also see &ldquo;AI&rdquo; next to it. That can&apos;t be turned off.</span>
              </div>
              <div className={t.fld} role="radiogroup" aria-label="Avatar">
                <span className="lbl" style={{ fontSize: 14, fontWeight: 500, color: '#33405A' }}>Avatar</span>
                <div className={t.avatars}>
                  {AVATARS.map((k) => (
                    <button key={k} type="button" role="radio" aria-checked={d.avatar === k} className={t.avBtn} onClick={() => set('avatar', k)}>
                      <Avatar kind={k} name={d.name} accent={theme.accent} />{AVATAR_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
              <div className={t.fld}>
                <span className={t.fldTop}><label htmlFor="st-greet" style={{ fontSize: 14, fontWeight: 500, color: '#33405A' }}>First message</label><span>{d.greeting.length} / 160</span></span>
                <textarea id="st-greet" className={`${a.field} ${t.textarea}`} rows={3} maxLength={160} value={d.greeting} onChange={(e) => set('greeting', e.target.value)} />
              </div>
            </section>

            <section className={t.sec} aria-labelledby="s2">
              <h2 id="s2">Colour</h2>
              <div className={t.fld}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#33405A' }}>Brand colour</span>
                <div className={t.swatches}>
                  {SWATCHES.map((c) => <button key={c} type="button" className={t.sw} style={{ background: c }} aria-label={`Use ${c}`} aria-pressed={d.brand.toUpperCase() === c} onClick={() => pickColour(c)} />)}
                  <label htmlFor="st-hex" className={t.hint}>Custom</label>
                  <input id="st-hex" className={`${a.field} ${t.hex}`} type="text" maxLength={7} value={hex} onChange={(e) => typeColour(e.target.value)} aria-invalid={!brandOk} />
                </div>
              </div>
              {contrast && (
                <div className={`${t.aa} ${contrast.passes ? t.aaOk : t.aaBad}`} role="status">
                  <span className={t.mono}>{contrast.ratio.toFixed(1)} : 1</span>
                  <span>{contrast.passes ? `Passes WCAG AA. ${contrast.text === '#FFFFFF' ? 'White' : 'Dark'} text on this colour is easy to read.` : 'Fails WCAG AA with both white and dark text. Choose another colour.'}</span>
                </div>
              )}
              {!brandOk && <div className={`${t.aa} ${t.aaBad}`} role="status"><span>Enter a six digit colour like #166FE5. The preview keeps the last good colour.</span></div>}
            </section>

            <section className={t.sec} aria-labelledby="s3">
              <h2 id="s3">How it talks</h2>
              <div className={t.fld}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#33405A' }}>Tone</span>
                <div className={t.seg} role="radiogroup" aria-label="Tone" style={{ alignSelf: 'flex-start' }}>
                  {TONES.map((k) => <button key={k} type="button" role="radio" aria-checked={d.tone === k} onClick={() => set('tone', k)}>{k[0].toUpperCase() + k.slice(1)}</button>)}
                </div>
                <span className={t.hint}>{TONE_HELP[d.tone]}</span>
              </div>
              <div className={t.fld}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#33405A' }}>Won&apos;t answer, hands over instead</span>
                <div className={t.tags}>
                  {d.refused.map((x) => <span key={x} className={t.tag}>{x}<button type="button" aria-label={`Remove ${x}`} onClick={() => set('refused', d.refused.filter((y) => y !== x))}><PathIcon d={CLOSE} size={14} /></button></span>)}
                </div>
                <div className={t.addRow}>
                  <label htmlFor="st-topic" className={t.sr}>Add a topic</label>
                  <input id="st-topic" className={a.field} type="text" maxLength={60} placeholder="Add a topic, e.g. electrical fault advice" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }} />
                  <button type="button" className={`${a.btn} ${a.btnGhost}`} onClick={addTopic}>Add</button>
                </div>
                <span className={t.hint}>Anything off-topic (sport, news, other companies) is always declined.</span>
              </div>
            </section>

            <section className={t.sec} aria-labelledby="s4">
              <h2 id="s4">Talk to a person</h2>
              <div className={t.toggleRow}>
                <div><b>Show &ldquo;Talk to a person&rdquo;</b><span className={t.hint}>Opens a separate form. Details are never typed into the chat.</span></div>
                <Switch checked={d.talk.enabled} onChange={(v) => setTalk('enabled', v)} label="Show Talk to a person" />
              </div>
              {d.talk.enabled && (
                <div className={t.two}>
                  <div className={t.fld}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#33405A' }}>The form asks for</span>
                    <div className={t.checks}>
                      <label><input type="checkbox" checked disabled />Name (always)</label>
                      <label><input type="checkbox" checked={d.talk.phone} onChange={(e) => setTalk('phone', e.target.checked)} />Phone</label>
                      <label><input type="checkbox" checked={d.talk.email} onChange={(e) => setTalk('email', e.target.checked)} />Email</label>
                      <label><input type="checkbox" checked={d.talk.suburb} onChange={(e) => setTalk('suburb', e.target.checked)} />Suburb</label>
                    </div>
                  </div>
                  <div className={t.fld}>
                    <label htmlFor="st-send">Send requests to</label>
                    <input id="st-send" className={a.field} type="email" placeholder="[owner email]" value={d.talk.sendTo} onChange={(e) => setTalk('sendTo', e.target.value)} />
                    <label htmlFor="st-reply" style={{ marginTop: 8 }}>Reply time we promise</label>
                    <ListSelect id="st-reply" value={d.talk.replyTime} options={[...REPLY_TIMES]} onChange={(v) => setTalk('replyTime', v as AssistantSettings['talk']['replyTime'])} triggerClass={a.field} />
                  </div>
                </div>
              )}
            </section>

            <section className={t.sec} aria-labelledby="s5">
              <h2 id="s5">Privacy</h2>
              <div className={t.two}>
                <div className={t.fld}>
                  <label htmlFor="st-priv">Privacy note link</label>
                  <input id="st-priv" className={a.field} type="url" placeholder="[privacy note URL]" value={d.privacyUrl} onChange={(e) => set('privacyUrl', e.target.value)} />
                  <span className={t.hint}>Linked under the chat input.</span>
                </div>
                <div className={t.fld}>
                  <label htmlFor="st-keep">Keep chats for</label>
                  <ListSelect id="st-keep" value={`${d.retentionDays} days`} options={RETENTION_OPTIONS.map((n) => `${n} days`)} onChange={(v) => set('retentionDays', parseInt(v, 10) as AssistantSettings['retentionDays'])} triggerClass={a.field} />
                  <span className={t.hint}>Chats are used only to find unanswered questions.</span>
                </div>
              </div>
            </section>
          </div>

          <aside className={t.setPreview} aria-label="Live preview">
            <div className={t.previewHead}>Live preview <small>updates as you type</small></div>
            <div className={t.pv} style={pv}>
              <div className={t.pvHead}>
                <Avatar kind={d.avatar} name={d.name} accent={theme.accent} />
                <div><b>{d.name || 'Assistant'}</b><small>{d.tone === 'brief' ? 'Short answers' : 'Usually replies instantly'}</small></div>
                <span className={t.pvAi}>AI</span>
              </div>
              <div className={t.pvBody}>
                <div className={t.pvBot}>{d.greeting}</div>
                <div className={t.pvUser}>Can I pay monthly?</div>
                <div className={t.pvBot}>Yes. You can spread the cost over 12 to 60 months through our finance partner.</div>
                <span className={t.pvChip}>Finance FAQ</span>
              </div>
              <div className={t.pvFoot}>
                <span className={t.pvIn}><span>Ask a question…</span><i><PathIcon d="M5 12h14M13 6l6 6-6 6" size={18} /></i></span>
                <span>AI assistant · <u>Privacy</u>{d.talk.enabled ? <> · <span style={{ color: '#166FE5' }}>Talk to a person</span></> : null}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {leaveTo !== null && (
        <div className={t.scrim} onMouseDown={(e) => { if (e.target === e.currentTarget) setLeaveTo(null); }}>
          <div className={t.modal} role="alertdialog" aria-modal="true" aria-labelledby="lv-h" aria-describedby="lv-p" ref={dialog}>
            <h2 id="lv-h">You have unsaved changes</h2>
            <p id="lv-p">If you leave now, the changes you made to the assistant settings will be lost.</p>
            <div className={t.modalBtns}>
              <button type="button" className={`${a.btn} ${a.btnPrimary}`} onClick={() => setLeaveTo(null)}>Keep editing</button>
              <button type="button" className={`${a.btn} ${a.btnGhost}`} disabled={!valid || busy} onClick={async () => { const to = leaveTo; setBusy(true); const res = await saveSettingsAction(d).catch(() => null); setBusy(false); if (res?.ok) { setSaved(res.settings); setD(res.settings); notify('Settings saved.'); setLeaveTo(null); router.push(to); } else setError(res && !res.ok ? res.error : 'That didn’t save. Check your connection and try again.'); }}>Save and leave</button>
              <button type="button" className={`${a.btn} ${a.btnDanger}`} onClick={() => leave(leaveTo)}>Discard and leave</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
