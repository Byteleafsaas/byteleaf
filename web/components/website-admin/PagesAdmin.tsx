'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePageAction } from '@/lib/server/actions/launch';
import type { PublishInfo } from '@/lib/server/launch/admin';
import { blockProblem, counterState } from '@/lib/launch/rules';
import { PAGES, PAGE_NAMES, type Block, type ButtonTarget, type PageKey, type Photo } from '@/lib/launch/types';
import b from '../booking-admin/booking.module.css';
import PublishBar from './PublishBar';
import w from './w.module.css';

const same = (a: unknown, c: unknown) => JSON.stringify(a) === JSON.stringify(c);
const LINKS = { services: '/admin/website/services', photos: '/admin/website/photos', settings: '/admin/website/settings' } as const;
const TARGETS: [ButtonTarget, string][] = [['contact', 'Opens the contact page'], ['whatsapp', 'Opens WhatsApp'], ['call', 'Starts a phone call']];

type Props = { initial: PageKey; pages: Record<PageKey, Block[]>; photos: Photo[]; areas: string[]; publish: PublishInfo };

export default function PagesAdmin({ initial, pages, photos, areas, publish }: Props) {
  const router = useRouter();
  const [page, setPage] = useState<PageKey>(initial);
  const [blocks, setBlocks] = useState<Block[]>(pages[initial]);
  const [saved, setSaved] = useState<Block[]>(pages[initial]);
  const [pane, setPane] = useState<'edit' | 'preview'>('edit');
  const [size, setSize] = useState<'desktop' | 'phone'>('desktop');
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [leave, setLeave] = useState<PageKey | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Pick up the server's copy after a save or publish, but never overwrite what is being typed.
  useEffect(() => { setReload((n) => n + 1); if (!same(blocks, saved)) return; setBlocks(pages[page]); setSaved(pages[page]); }, [pages]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !same(blocks, saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patch = (id: string, p: Partial<Block>) => { setBlocks((bs) => bs.map((x) => (x.id === id ? ({ ...x, ...p } as Block) : x))); setError(''); };
  const problems = blocks.map((x) => blockProblem(x)).filter(Boolean).length;

  const save = async (): Promise<boolean> => {
    if (problems) { setError('Fix the highlighted fields first.'); return false; }
    setSaving(true);
    const r = await savePageAction(page, blocks.map((x) => ({ id: x.id, value: 'value' in x ? x.value : undefined, on: x.type === 'section' ? x.on : undefined, target: x.type === 'button' ? x.target : undefined })));
    setSaving(false);
    if (!r.ok) { setError(r.error); return false; }
    setSaved(blocks); setError(''); setReload((n) => n + 1);
    clearTimeout(timer.current); setToast('Saved as a draft. Publish to show it on your site.'); timer.current = setTimeout(() => setToast(''), 4000);
    router.refresh();
    return true;
  };
  const go = (k: PageKey) => { setPage(k); setBlocks(pages[k]); setSaved(pages[k]); setError(''); setLeave(null); setPane('edit'); window.history.replaceState(null, '', `/admin/website/pages/${k}`); };
  const pick = (k: PageKey) => { if (k === page) return; if (dirty) setLeave(k); else go(k); };

  const photoName = (p: Photo) => p.alt || (p.kind === 'sample' ? 'Sample photo' : 'Photo without a description');

  const renderBlock = (x: Block) => {
    const prob = blockProblem(x);
    if (x.type === 'heading' || x.type === 'text') {
      const len = x.value.length; const st = counterState(len, x.max);
      const common = { id: `b-${x.id}`, className: b.field, value: x.value, 'aria-invalid': Boolean(prob), 'aria-describedby': `h-${x.id}`, onChange: (e: { target: { value: string } }) => patch(x.id, { value: e.target.value }) };
      return (
        <div className={b.col} key={x.id}>
          <span className={b.between}><label className={b.lbl} htmlFor={`b-${x.id}`}>{x.label}</label><span className={b.cnt} style={{ color: st === 'over' ? '#B42318' : st === 'near' ? '#8A5200' : '#4B5872' }}>{len} / {x.max}</span></span>
          {x.type === 'text' ? <textarea rows={4} {...common} /> : <input {...common} />}
          <span id={`h-${x.id}`} className={b.hint} role={prob ? 'alert' : undefined} style={{ color: prob ? '#B42318' : '#4B5872' }}>{prob ?? x.help}</span>
        </div>
      );
    }
    if (x.type === 'button') {
      return (
        <div className={b.col} key={x.id}>
          <span className={b.between}><label className={b.lbl} htmlFor={`b-${x.id}`}>{x.label}</label><span className={b.cnt}>{x.value.length} / {x.max}</span></span>
          <input id={`b-${x.id}`} className={b.field} value={x.value} aria-invalid={Boolean(prob)} aria-describedby={`h-${x.id}`} onChange={(e) => patch(x.id, { value: e.target.value })} />
          <label className={b.lbl} htmlFor={`t-${x.id}`} style={{ marginTop: 4 }}>What it does</label>
          <select id={`t-${x.id}`} className={b.field} value={x.target} onChange={(e) => patch(x.id, { target: e.target.value as ButtonTarget })}>{TARGETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <span id={`h-${x.id}`} className={b.hint} role={prob ? 'alert' : undefined} style={{ color: prob ? '#B42318' : '#4B5872' }}>{prob ?? x.help}</span>
        </div>
      );
    }
    if (x.type === 'image') {
      return (
        <div className={b.col} key={x.id}>
          <label className={b.lbl} htmlFor={`b-${x.id}`}>{x.label}</label>
          <select id={`b-${x.id}`} className={b.field} value={x.value} onChange={(e) => patch(x.id, { value: e.target.value })}>
            <option value="">No photo (show the plain design)</option>
            {photos.map((p) => <option key={p.id} value={p.id}>{photoName(p)}</option>)}
          </select>
          <span className={b.hint}>{x.help} <Link href={LINKS.photos} className={w.lnk}>Add or manage photos</Link></span>
        </div>
      );
    }
    if (x.type === 'section') {
      return (
        <label className={b.chk} key={x.id} style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={x.on} onChange={(e) => patch(x.id, { on: e.target.checked })} />
          <span><strong>{x.label}</strong><br /><span className={b.hint}>{x.desc}</span></span>
        </label>
      );
    }
    if (x.type === 'link') {
      return <div className={b.col} key={x.id}><strong className={b.lbl}>{x.label}</strong><span className={b.hint}>{x.desc} <Link href={LINKS[x.to]} className={w.lnk}>{x.toLabel}</Link></span></div>;
    }
    return (
      <div className={b.col} key={x.id}>
        <strong className={b.lbl}>{x.label}</strong>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{areas.map((a) => <span key={a} className={w.statePill} style={{ background: '#F4F7FB', color: '#33405A' }}>{a}</span>)}</span>
        <span className={b.hint}>{x.help} <Link href={LINKS.settings} className={w.lnk}>Change in Site settings</Link></span>
      </div>
    );
  };

  return (
    <div className={w.wrapPad}>
      <div className={b.page}>
        <header className={b.header}>
          <div className={b.titleBox}><span className={b.crumb}>Website</span><h1 className={b.h1}>Pages</h1></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {dirty && <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#8A5200' }}><span className={w.dot} aria-hidden="true" />Unsaved changes</span>}
            <button type="button" className={`${b.btn} ${b.btnPrimary}`} onClick={() => void save()} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save draft'}</button>
          </div>
        </header>
        <div className={b.pad} style={{ gap: 14 }}>
          <div role="tablist" aria-label="Pages" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PAGES.map((k) => <button key={k} type="button" role="tab" aria-selected={k === page} className={`${b.btn} ${b.btnSm} ${k === page ? b.btnPrimary : b.btnGhost}`} onClick={() => pick(k)}>{PAGE_NAMES[k]}</button>)}
          </div>
          <div className={w.editSwitch} role="group" aria-label="Edit or preview">
            <button type="button" className={`${b.btn} ${b.btnSm} ${pane === 'edit' ? b.btnPrimary : b.btnGhost}`} aria-pressed={pane === 'edit'} onClick={() => setPane('edit')}>Edit</button>
            <button type="button" className={`${b.btn} ${b.btnSm} ${pane === 'preview' ? b.btnPrimary : b.btnGhost}`} aria-pressed={pane === 'preview'} onClick={() => setPane('preview')}>Preview</button>
          </div>
          <div className={w.split} data-pane={pane}>
            <section className={`${b.panel} ${w.editCol}`} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }} aria-label={`Edit ${PAGE_NAMES[page]}`}>
              {error && <div role="alert" className={b.errBar}>{error}</div>}
              {blocks.map(renderBlock)}
            </section>
            <aside className={w.prevCol} aria-label="Preview">
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={b.mono} style={{ fontSize: 11, color: '#4B5872' }}>{dirty ? 'PREVIEW OF YOUR LAST SAVED DRAFT' : 'PREVIEW OF YOUR DRAFT'}</span>
                <span role="group" aria-label="Preview size" style={{ display: 'flex', gap: 6 }}>
                  {(['desktop', 'phone'] as const).map((z) => <button key={z} type="button" aria-pressed={size === z} className={`${b.btn} ${b.btnSm} ${size === z ? b.btnPrimary : b.btnGhost}`} onClick={() => setSize(z)}>{z === 'desktop' ? 'Desktop' : 'Phone'}</button>)}
                </span>
              </span>
              <div className={w.frameBox} data-size={size}>
                <iframe key={`${page}-${reload}`} title={`${PAGE_NAMES[page]} preview`} src={`/admin/website/preview/${page}`} className={w.frame} />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {leave && (
        <div className={b.scrim} onClick={() => setLeave(null)}>
          <div className={b.modal} role="alertdialog" aria-modal="true" aria-labelledby="lv-h" onClick={(e) => e.stopPropagation()}>
            <h2 id="lv-h">You have unsaved changes</h2>
            <p>Save them as a draft before leaving {PAGE_NAMES[page]}?</p>
            <span className={b.modalActions}>
              <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={() => setLeave(null)} autoFocus>Stay here</button>
              <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={() => go(leave)}>Don’t save</button>
              <button type="button" className={`${b.btn} ${b.btnPrimary}`} onClick={async () => { const to = leave; if (await save()) go(to); else setLeave(null); }}>Save draft</button>
            </span>
          </div>
        </div>
      )}
      {toast && <div role="status" className={b.toast}>{toast}</div>}
      <PublishBar publish={publish} previewHref={`/admin/website/preview/${page}`} />
    </div>
  );
}
