'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { ICON, PathIcon } from '@/components/admin/icons';
import { Switch, TopBar } from '@/components/admin/Ui';
import s from '@/components/admin/admin.module.css';
import p from '@/components/admin/projects.module.css';
import { useAdmin } from '@/lib/admin/store';
import type { ImageRef, Project, ProjectCategory } from '@/lib/admin/types';
import { saveProjectAction } from '@/lib/server/actions/projects';

const CATS: ProjectCategory[] = ['Design', 'Frontend', 'Backend', 'AI'];
const INDUSTRIES = ['Retail & e-commerce', 'Logistics', 'Health & pharmacy', 'Professional services', 'Property', 'Manufacturing', 'Other'];
const MAX_IMG = 5 * 1024 * 1024;
const OK_IMG = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_GALLERY = 8;

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-project';

const EMPTY: Omit<Project, 'id' | 'slug' | 'updated'> = {
  name: '', client: '', type: '', industry: INDUSTRIES[0], categories: ['Frontend'], stack: ['Next.js', 'Node.js'],
  summary: '', challenge: '', whatWeDid: '', result: '', live: true, featured: false, pattern: 0, cover: null, gallery: [],
};

export default function ProjectEditor({ id }: { id?: string }) {
  const { projects, notify, refresh } = useAdmin();
  const router = useRouter();
  const existing = id ? projects.find((x) => x.id === id) : undefined;
  const [f, setF] = useState(() => (existing ? { ...existing } : { ...EMPTY }));
  const [tagDraft, setTagDraft] = useState('');
  const [imgErr, setImgErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [nameErr, setNameErr] = useState(false);
  const [saving, setSaving] = useState(false);

  if (id && !existing) {
    return (
      <>
        <TopBar crumb="Admin / Projects" title="Project not found" />
        <div className={s.content}>
          <Link className={`${s.btn} ${s.btnPrimary}`} style={{ alignSelf: 'flex-start' }} href="/admin/projects">Back to projects</Link>
        </div>
      </>
    );
  }

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }));

  // Slug is generated from the name and must be unique.
  const uniqueSlug = () => {
    const base = slugify(f.name);
    const taken = new Set(projects.filter((x) => x.id !== id).map((x) => x.slug));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    return slug;
  };
  const slug = uniqueSlug();

  const addTag = () => {
    const v = tagDraft.trim().replace(/,$/, '');
    if (v && !f.stack.includes(v)) set('stack', [...f.stack, v]);
    setTagDraft('');
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !tagDraft && f.stack.length) {
      set('stack', f.stack.slice(0, -1));
    }
  };

  // Upload to /admin/upload (stored in Garage/S3). The form keeps only the returned key; images removed here are
  // deleted from storage when the project is saved.
  const uploadOne = async (file: File): Promise<ImageRef | null> => {
    if (!OK_IMG.includes(file.type)) {
      setImgErr('Use a JPG, PNG or WebP image.');
      return null;
    }
    if (file.size > MAX_IMG) {
      setImgErr('Images must be 5 MB or smaller.');
      return null;
    }
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/admin/upload', { method: 'POST', body });
    const json = (await res.json().catch(() => ({}))) as Partial<ImageRef> & { error?: string };
    if (!res.ok || !json.key) {
      setImgErr(json.error ?? 'The upload failed. Please try again.');
      return null;
    }
    return { key: json.key, width: json.width!, height: json.height! };
  };

  const onCover = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImgErr('');
    setUploading(true);
    const img = await uploadOne(file);
    setUploading(false);
    if (img) set('cover', img);
  };

  const onGallery = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, MAX_GALLERY - f.gallery.length));
    e.target.value = '';
    if (!files.length) return;
    setImgErr('');
    setUploading(true);
    const added: ImageRef[] = [];
    for (const file of files) {
      const img = await uploadOne(file);
      if (img) added.push(img);
    }
    setUploading(false);
    if (added.length) setF((o) => ({ ...o, gallery: [...o.gallery, ...added] }));
  };

  const save = async (live: boolean) => {
    if (!f.name.trim()) {
      setNameErr(true);
      document.getElementById('e-name')?.focus();
      return;
    }
    setSaving(true);
    const r = await saveProjectAction({ id: existing?.id, name: f.name, client: f.client, type: f.type, industry: f.industry, categories: f.categories, stack: f.stack, summary: f.summary, challenge: f.challenge, whatWeDid: f.whatWeDid, result: f.result, live, featured: f.featured, cover: f.cover, gallery: f.gallery });
    setSaving(false);
    if (!r.ok) return notify(r.error);
    notify(live ? `${r.project.name} is live on the website.` : 'Draft saved — hidden from the website.');
    refresh();
    router.push('/admin/projects');
  };

  const count = f.summary.length;

  return (
    <>
      <header className={s.topbar}>
        <div className={s.titleBox}>
          <Link className={p.back} href="/admin/projects">
            <PathIcon d="M19 12H5M11 18l-6-6 6-6" size={14} sw={2} />
            Projects
          </Link>
          <h1 className={s.h1}>{existing ? 'Edit project' : 'Add project'}</h1>
        </div>
        <div className={s.actions}>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={saving || uploading} onClick={() => save(false)}>Save draft</button>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={saving || uploading} onClick={() => save(f.live)}>{f.live ? 'Publish project' : 'Save project'}</button>
        </div>
      </header>

      <div className={p.edit}>
        <form className={p.form} onSubmit={(e) => { e.preventDefault(); save(f.live); }}>
          <section className={`${s.panel} ${s.rise} ${p.sec}`} aria-labelledby="s1">
            <h2 id="s1">Basics</h2>
            <div className={p.grid}>
              <div className={s.fg}>
                <label htmlFor="e-name" className={s.label}>Project name *</label>
                <input id="e-name" className={`${s.field} ${p.fieldC}`} type="text" placeholder="e.g. Online store rebuild" value={f.name} required aria-invalid={nameErr} onChange={(e) => { set('name', e.target.value); setNameErr(false); }} />
                {nameErr && <span className={p.err} role="alert">Give the project a name.</span>}
              </div>
              <div className={s.fg}><label htmlFor="e-client" className={s.label}>Client name</label><input id="e-client" className={`${s.field} ${p.fieldC}`} type="text" placeholder="Shown publicly — get permission first" value={f.client} onChange={(e) => set('client', e.target.value)} /></div>
              <div className={s.fg}><label htmlFor="e-type" className={s.label}>Project type</label><input id="e-type" className={`${s.field} ${p.fieldC}`} type="text" placeholder="e.g. E-commerce storefront" value={f.type} onChange={(e) => set('type', e.target.value)} /></div>
              <div className={s.fg}>
                <label htmlFor="e-ind" className={s.label}>Industry</label>
                <select id="e-ind" className={`${s.field} ${p.fieldC}`} value={f.industry} onChange={(e) => set('industry', e.target.value)}>
                  {INDUSTRIES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <fieldset className={s.fieldset}>
              <legend className={s.label} style={{ padding: 0, marginBottom: 10 }}>Categories <i style={{ fontStyle: 'normal', fontWeight: 400, color: 'var(--muted)' }}>— used by the filter on the Projects page</i></legend>
              <div className={s.chips}>
                {CATS.map((c) => (
                  <button key={c} type="button" className={p.chipBtn} aria-pressed={f.categories.includes(c)} onClick={() => set('categories', f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c])}>{c}</button>
                ))}
              </div>
            </fieldset>
            <div className={s.fg} style={{ gap: 10 }}>
              <label htmlFor="e-tag" className={s.label}>Tech stack</label>
              <div className={p.tagBox}>
                {f.stack.map((t) => (
                  <span key={t} className={p.tag}>
                    {t}
                    <button type="button" className={p.tagx} aria-label={`Remove ${t}`} onClick={() => set('stack', f.stack.filter((x) => x !== t))}>
                      <PathIcon d={ICON.close} size={12} sw={2.6} />
                    </button>
                  </span>
                ))}
                <input id="e-tag" className={p.tagInput} type="text" placeholder="Type and press Enter…" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={onTagKey} onBlur={addTag} />
              </div>
              <span className={p.hint}>Shown as small tags on the project card.</span>
            </div>
          </section>

          <section className={`${s.panel} ${s.rise} ${s.d1} ${p.sec}`} aria-labelledby="s2">
            <h2 id="s2">Story</h2>
            <div className={s.fg}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <label htmlFor="e-sum" className={s.label}>One-line summary</label>
                <span className={`${p.counter} ${count > 120 ? p.counterWarn : ''}`}>{count} / 140</span>
              </div>
              <textarea id="e-sum" className={`${s.field} ${s.area}`} rows={2} maxLength={140} placeholder="What you built and the outcome, in one sentence." value={f.summary} onChange={(e) => set('summary', e.target.value)} />
            </div>
            <div className={s.fg}><label htmlFor="e-ch" className={s.label}>The challenge</label><textarea id="e-ch" className={`${s.field} ${s.area}`} rows={3} placeholder="What wasn't working for the client before?" value={f.challenge} onChange={(e) => set('challenge', e.target.value)} /></div>
            <div className={s.fg}><label htmlFor="e-did" className={s.label}>What we did</label><textarea id="e-did" className={`${s.field} ${s.area}`} rows={3} placeholder="Design, build, integrations — in two or three lines." value={f.whatWeDid} onChange={(e) => set('whatWeDid', e.target.value)} /></div>
            <div className={s.fg}><label htmlFor="e-res" className={s.label}>The result</label><textarea id="e-res" className={`${s.field} ${s.area}`} rows={3} placeholder="A real, measurable outcome the client agreed to share." value={f.result} onChange={(e) => set('result', e.target.value)} /></div>
          </section>

          <section className={`${s.panel} ${s.rise} ${s.d2} ${p.sec}`} aria-labelledby="s3">
            <h2 id="s3">Images</h2>
            {f.cover ? (
              <div className={p.coverSet}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/media/${f.cover.key}`} alt="Cover preview" className={p.coverImg} />
                <div className={p.coverBar}>
                  <span className={p.hint}>{f.cover.width} × {f.cover.height} px</span>
                  <div className={s.btnRow}>
                    <label className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} htmlFor="e-cover" style={{ cursor: 'pointer' }}>Replace</label>
                    <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} onClick={() => set('cover', null)}>Remove</button>
                  </div>
                </div>
                <input id="e-cover" type="file" accept="image/jpeg,image/png,image/webp" className={s.sr} onChange={onCover} />
              </div>
            ) : (
              <label className={`${p.drop} ${p.cover}`} htmlFor="e-cover">
                <span className={p.coverIco}><PathIcon d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" size={24} /></span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{uploading ? 'Uploading…' : <>Drop a cover image or <span style={{ color: 'var(--blue-600)' }}>browse</span></>}</span>
                <span className={p.hint}>JPG, PNG or WebP · 1600 × 1000 px recommended · max 5 MB</span>
                <input id="e-cover" type="file" accept="image/jpeg,image/png,image/webp" className={s.sr} onChange={onCover} />
              </label>
            )}
            {imgErr && <span className={p.err} role="alert">{imgErr}</span>}
            <div className={s.fg} style={{ gap: 10 }}>
              <span className={s.label}>Gallery <i style={{ fontStyle: 'normal', fontWeight: 400, color: 'var(--muted)' }}>(optional, shown on the case study · up to {MAX_GALLERY})</i></span>
              <div className={p.gal}>
                {f.gallery.map((g, i) => (
                  <span key={g.key} className={p.galItem} style={{ position: 'relative', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/media/${g.key}`} alt={`Gallery image ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button type="button" className={p.galRm} aria-label={`Remove gallery image ${i + 1}`} onClick={() => set('gallery', f.gallery.filter((x) => x.key !== g.key))}>
                      <PathIcon d={ICON.close} size={12} sw={2.6} />
                    </button>
                  </span>
                ))}
                {f.gallery.length < MAX_GALLERY && (
                  <label className={`${p.drop} ${p.galItem} ${p.galAdd}`} htmlFor="e-gal">
                    {uploading ? '…' : '+ Add'}
                    <input id="e-gal" type="file" accept="image/jpeg,image/png,image/webp" multiple className={s.sr} onChange={onGallery} />
                  </label>
                )}
              </div>
            </div>
          </section>

          <section className={`${s.panel} ${s.rise} ${s.d3} ${p.sec}`} aria-labelledby="s4">
            <h2 id="s4">Search &amp; sharing</h2>
            <div className={s.fg}>
              <label htmlFor="e-slug" className={s.label}>Page address</label>
              <div className={p.slug}>
                <span className={p.slugPre}>/projects/</span>
                <input id="e-slug" className={p.slugIn} type="text" value={slug} readOnly />
              </div>
              <span className={p.hint}>Created automatically from the project name.</span>
            </div>
          </section>
        </form>

        <aside className={p.side}>
          <section className={`${s.panel} ${s.rise} ${s.d1} ${p.sideSec}`} aria-labelledby="pub">
            <h2 id="pub">Publishing</h2>
            <div className={p.swRow}>
              <span className={p.swText}><span>Show on website</span><span className={p.hint}>{f.live ? 'Visible to visitors once saved' : 'Hidden — only you can see it'}</span></span>
              <Switch checked={f.live} onChange={(v) => set('live', v)} label="Show on website" />
            </div>
            <div className={p.swRow}>
              <span className={p.swText}><span>Featured project</span><span className={p.hint}>Replaces the current featured project</span></span>
              <Switch checked={f.featured} onChange={(v) => set('featured', v)} label="Featured project" />
            </div>
          </section>

          <section className={`${s.panel} ${s.rise} ${s.d2} ${p.sideSec}`} aria-labelledby="prev" style={{ gap: 14 }}>
            <div className={p.prevHead}><h2 id="prev">Card preview</h2><span className={p.live}>LIVE</span></div>
            <article className={p.card}>
              <div aria-hidden="true" className={`${p.cardImg} ${f.cover ? '' : p.p0}`} style={f.cover ? { backgroundImage: `url(/media/${f.cover.key})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>{!f.cover && <span>COVER IMAGE</span>}</div>
              <div className={p.cardBody}>
                <span className={p.cardType}>{f.type || 'Project type'}</span>
                <span className={p.cardName}>{f.name || 'Project name'}</span>
                <span className={p.cardSum}>{f.summary || 'Your one-line summary appears here as you type.'}</span>
                <span className={p.cardTags}>{f.stack.map((t) => <span key={t}>{t}</span>)}</span>
              </div>
            </article>
          </section>
        </aside>
      </div>
    </>
  );
}
