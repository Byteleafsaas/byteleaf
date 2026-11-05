'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { addPhotoAction, movePhotoAction, removePhotoAction, updatePhotoAction } from '@/lib/server/actions/launch';
import type { PublishInfo } from '@/lib/server/launch/admin';
import type { Photo } from '@/lib/launch/types';
import b from '../booking-admin/booking.module.css';
import PublishBar from './PublishBar';
import w from './w.module.css';

type Filter = 'all' | 'gallery' | 'alt';
type Upload = { id: number; name: string; state: 'busy' | 'failed'; error?: string };
const WHERE = [['home', 'Home'], ['about', 'About'], ['gallery', 'Gallery']] as const;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function Thumb({ p }: { p: Photo }) {
  if (p.kind === 'upload' && p.key) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/media/${p.key}`} alt={p.alt} className={w.thumb} loading="lazy" />;
  }
  return <div className={w.thumb} style={{ background: '#2F7D55', display: 'grid', placeItems: 'center', color: '#FAF6EC', fontSize: 12 }} role="img" aria-label={p.alt || 'Sample photo'}>Sample photo</div>;
}

export default function PhotosAdmin({ photos, siteName, publish }: { photos: Photo[]; siteName: string; publish: PublishInfo }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<Photo | null>(null);
  const [alts, setAlts] = useState<Record<string, string>>({});
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirm(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const flash = (t: string) => { clearTimeout(timer.current); setToast(t); timer.current = setTimeout(() => setToast(''), 4000); };
  const needAlt = photos.filter((p) => !p.alt.trim()).length;
  const shown = photos.filter((p) => (filter === 'gallery' ? p.on.gallery : filter === 'alt' ? !p.alt.trim() : true));

  const send = async (file: File) => {
    const id = ++seq.current;
    if (!OK_TYPES.includes(file.type)) { setUploads((u) => [...u, { id, name: file.name, state: 'failed', error: 'Use a JPG, PNG or WebP photo.' }]); return; }
    if (file.size > 10 * 1048576) { setUploads((u) => [...u, { id, name: file.name, state: 'failed', error: `Too big (${(file.size / 1048576).toFixed(1)} MB). Photos can be up to 10 MB.` }]); return; }
    setUploads((u) => [...u, { id, name: file.name, state: 'busy' }]);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/admin/website/upload', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'The upload failed. Please try again.');
      const r = await addPhotoAction({ key: j.key, w: j.width });
      if (!r.ok) throw new Error(r.error);
      setUploads((u) => u.filter((x) => x.id !== id));
      router.refresh();
    } catch (e) {
      setUploads((u) => u.map((x) => (x.id === id ? { ...x, state: 'failed', error: e instanceof Error ? e.message : 'The upload failed. Please try again.' } : x)));
    }
  };
  const take = (files: FileList | null) => { if (files) Array.from(files).forEach((f) => void send(f)); };
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); };

  const act = async (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, msg?: string) => {
    const r = await fn();
    if (!r.ok) flash(r.error); else if (msg) flash(msg);
    router.refresh();
  };

  return (
    <div className={w.wrapPad}>
      <div className={b.page}>
        <header className={b.header}>
          <div className={b.titleBox}><span className={b.crumb}>{siteName} / Website</span><h1 className={b.h1}>Photos</h1></div>
          <button type="button" className={`${b.btn} ${b.btnPrimary}`} onClick={() => input.current?.click()}>Add photos</button>
        </header>
        <div className={b.pad} style={{ gap: 16 }}>
          <div
            className={w.drop} data-over={over} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
            role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
          >
            <strong>Drop photos here, or choose them</strong>
            <span className={b.hint}>JPG, PNG or WebP · up to 10 MB each · we resize them for you</span>
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { take(e.target.files); e.target.value = ''; }} />

          {uploads.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }} aria-live="polite">
              {uploads.map((u) => (
                <li key={u.id} className={b.panel} style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{u.name}</span>
                  <span className={b.hint} role={u.state === 'failed' ? 'alert' : undefined} style={{ color: u.state === 'failed' ? '#B42318' : '#4B5872' }}>{u.state === 'busy' ? 'Uploading…' : u.error}</span>
                  {u.state === 'failed' && <button type="button" className={`${b.btn} ${b.btnSm} ${b.btnGhost}`} onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))}>Dismiss</button>}
                </li>
              ))}
            </ul>
          )}

          {photos.length === 0 ? (
            <div className={b.panel} style={{ padding: 28, textAlign: 'center' }}>
              <h2 className={b.h2}>No photos yet</h2>
              <p className={b.hint}>Add a few of your best jobs. Customers trust a site with real pictures.</p>
            </div>
          ) : (
            <>
              <div role="group" aria-label="Filter photos" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {([['all', `All (${photos.length})`], ['gallery', 'On the gallery'], ['alt', `Needs a description (${needAlt})`]] as const).map(([k, l]) => (
                  <button key={k} type="button" className={`${b.btn} ${b.btnSm} ${filter === k ? b.btnPrimary : b.btnGhost}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
                ))}
              </div>
              {shown.length === 0 && <p className={b.hint}>Nothing matches this filter.</p>}
              <ul className={w.photoGrid}>
                {shown.map((p) => {
                  const i = photos.findIndex((x) => x.id === p.id);
                  const alt = alts[p.id] ?? p.alt;
                  return (
                    <li key={p.id} className={b.panel} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Thumb p={p} />
                      <div className={b.col}>
                        <label className={b.lbl} htmlFor={`alt-${p.id}`}>Description</label>
                        <input
                          id={`alt-${p.id}`} className={b.field} value={alt} maxLength={200} placeholder="What is in this photo?"
                          onChange={(e) => setAlts((a) => ({ ...a, [p.id]: e.target.value }))}
                          onBlur={() => { if (alts[p.id] !== undefined && alts[p.id].trim() !== p.alt) void act(() => updatePhotoAction(p.id, { alt: alts[p.id] }), 'Saved as a draft. Publish to show it on your site.'); }}
                        />
                        {!p.alt.trim() && <span className={b.hint} style={{ color: '#8A5200' }}>Needs a description. It helps people who can’t see the photo.</span>}
                      </div>
                      <div role="group" aria-label="Show this photo on" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {WHERE.map(([k, l]) => (
                          <button key={k} type="button" className={`${w.onChip} ${p.on[k] ? w.onChipOn : ''}`} aria-pressed={p.on[k]} onClick={() => void act(() => updatePhotoAction(p.id, { on: { [k]: !p.on[k] } }), 'Saved as a draft. Publish to show it on your site.')}>{l}</button>
                        ))}
                      </div>
                      {p.on.home && p.w > 0 && p.w < 1200 && <span className={b.hint} style={{ color: '#8A5200' }}>Small for the Home page ({p.w}px wide). It may look soft.</span>}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className={`${b.btn} ${b.btnSm} ${b.btnGhost}`} disabled={i === 0} aria-label="Move earlier" onClick={() => void act(() => movePhotoAction(p.id, -1))}>←</button>
                          <button type="button" className={`${b.btn} ${b.btnSm} ${b.btnGhost}`} disabled={i === photos.length - 1} aria-label="Move later" onClick={() => void act(() => movePhotoAction(p.id, 1))}>→</button>
                        </span>
                        <button type="button" className={`${b.btn} ${b.btnSm} ${b.btnGhost}`} onClick={() => setConfirm(p)}>Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      {confirm && (
        <div className={b.scrim} onClick={() => setConfirm(null)}>
          <div className={b.modal} role="alertdialog" aria-modal="true" aria-labelledby="rm-h" onClick={(e) => e.stopPropagation()}>
            <h2 id="rm-h">Remove this photo?</h2>
            <p>{WHERE.filter(([k]) => confirm.on[k]).length ? `It will disappear from: ${WHERE.filter(([k]) => confirm.on[k]).map(([, l]) => l).join(', ')}.` : 'It isn’t shown anywhere right now.'} Your live site keeps it until you publish.</p>
            <span className={b.modalActions}>
              <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={() => setConfirm(null)} autoFocus>Keep it</button>
              <button type="button" className={`${b.btn} ${b.btnRed}`} onClick={() => { const id = confirm.id; setConfirm(null); void act(() => removePhotoAction(id), 'Photo removed. Publish to update your site.'); }}>Remove photo</button>
            </span>
          </div>
        </div>
      )}
      {toast && <div role="status" className={b.toast}>{toast}</div>}
      <PublishBar publish={publish} previewHref="/admin/website/preview/gallery" />
    </div>
  );
}
