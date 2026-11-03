'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { PathIcon } from '@/components/admin/icons';
import { getSourceProgressAction, startTextSourceAction, startWebSourceAction } from '@/lib/server/actions/assistant-admin';
import type { SourceRow } from '@/lib/server/assistant/admin';
import a from '@/components/admin/admin.module.css';
import s from './assistant.module.css';

type Via = 'website' | 'upload' | 'type';
const WEB = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18';
const UP = 'M12 16V4M7 9l5-5 5 5M4 20h16';
const TYPED = 'M4 6h16M4 12h10M4 18h7';
const WARN = 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z';
const MAX_PAGES = 30;

const ROUTES: { via: Via; icon: string; title: string; text: string }[] = [
  { via: 'website', icon: WEB, title: 'Add a website', text: 'Read pages from a web address' },
  { via: 'upload', icon: UP, title: 'Upload files', text: 'PDF, Word or text' },
  { via: 'type', icon: TYPED, title: 'Type or paste', text: 'Quick facts and answers' },
];

const STEPS = [
  { t: 'We read it', d: 'Pages, files or text are turned into plain text.' },
  { t: 'AI cleans and organises', d: 'Split into short items, duplicates merged, anything unclear flagged.' },
  { t: 'You review', d: 'Approve, edit or reject each item. Conflicts are shown side by side.' },
  { t: 'You publish', d: 'Only approved items go live in the chat.' },
];

function Visibility({ value, onChange }: { value: boolean; onChange: (staffOnly: boolean) => void }) {
  return (
    <fieldset className={s.vis}>
      <legend className={s.lbl}>Who can see answers from this source?</legend>
      <label className={s.visOpt}><input type="radio" name="vis" checked={!value} onChange={() => onChange(false)} /><span><b>Everyone</b><span>Customers and staff</span></span></label>
      <label className={s.visOpt}><input type="radio" name="vis" checked={value} onChange={() => onChange(true)} /><span><b>Staff only</b><span>Internal procedures and policies</span></span></label>
    </fieldset>
  );
}

function Progress({ ids, via, onAnother }: { ids: string[]; via: Via; onAnother: () => void }) {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const poll = useCallback(async () => {
    const res = await getSourceProgressAction(ids);
    if (res.ok) setRows(res.rows);
  }, [ids]);

  const done = rows.length === ids.length && rows.every((r) => r.status !== 'processing');
  useEffect(() => {
    void poll();
    if (done) return;
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
  }, [poll, done]);

  const steps = via === 'type' ? ['Reading your text', 'AI cleaning', 'Ready to review'] : [via === 'website' ? 'Reading the page' : 'Reading the file', 'AI cleaning', 'Ready to review'];
  const stepOf = (r?: SourceRow) => {
    if (!r) return 0;
    if (r.status !== 'processing') return 3;
    return r.stage === 'clean' ? 1 : 0;
  };
  const items = rows.reduce((n, r) => n + (r.status === 'review' || r.status === 'partly' || r.status === 'live' ? r.items : 0), 0);
  const bad = rows.filter((r) => r.status === 'failed' || r.status === 'nothing');
  const ok = rows.filter((r) => r.status !== 'failed' && r.status !== 'nothing' && r.status !== 'processing');

  return (
    <div className={s.addMain}>
      {!done && (
        <section className={`${a.panel} ${s.stages}`} aria-live="polite">
          <h2 style={{ margin: 0, fontSize: 20 }}>Reading and cleaning…</h2>
          {(rows.length ? rows : ids.map((id) => ({ id }) as SourceRow)).map((r) => (
            <div key={r.id}>
              {rows.length > 1 && <b style={{ fontSize: 15 }}>{r.name}</b>}
              <ol className={s.stageList}>
                {steps.map((label, i) => (
                  <li key={label} data-state={i < stepOf(r) ? 'done' : i === stepOf(r) ? 'now' : 'todo'}>
                    <span className={s.dot}>
                      {i < stepOf(r) ? <PathIcon d="M5 12l5 5L20 7" size={12} /> : i === stepOf(r) ? <svg className={s.spin} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg> : null}
                    </span>
                    {label}
                    {i === 1 && stepOf(r) === 1 && (r as SourceRow).typeLabel?.includes('cleaning') ? <span className={s.hint}>{(r as SourceRow).typeLabel.split('· ').pop()}</span> : null}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      {done && ok.length > 0 && (
        <section className={s.resultOk} role="status">
          <h2>{items} item{items === 1 ? '' : 's'} ready for review</h2>
          <p>AI has tidied {ok.length === 1 ? 'this source' : 'these sources'} into short items. Nothing is live yet, so customers see no change until you approve and publish.</p>
          <div className={a.btnRow}>
            <Link className={`${a.btn} ${a.btnPrimary}`} href="/admin/assistant/review">Review items</Link>
            <button type="button" className={`${a.btn} ${a.btnGhost}`} onClick={onAnother}>Add another source</button>
          </div>
        </section>
      )}
      {done && bad.map((r) => (
        <section key={r.id} className={s.resultBad} role="alert">
          <h2>{r.status === 'nothing' ? 'Nothing useful found' : `Couldn’t read ${r.name}`}</h2>
          <p>{r.problem}</p>
          <div className={a.btnRow}>
            <button type="button" className={`${a.btn} ${a.btnGhost}`} onClick={onAnother}>Try again</button>
            <Link className={`${a.btn} ${a.btnGhost}`} href="/admin/assistant/sources/new?via=type">Add it as text instead</Link>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AddSourceView({ initialVia }: { initialVia: Via }) {
  const [via, setVia] = useState<Via>(initialVia);
  const [staffOnly, setStaffOnly] = useState(false);
  const [url, setUrl] = useState('');
  const [follow, setFollow] = useState(true);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState<string[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | File[]) => setFiles((f) => [...f, ...Array.from(list)].slice(0, 5));
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (via === 'website') {
        const res = await startWebSourceAction({ workspace: 'khumalo', url, follow, staffOnly });
        if (res.ok) setStarted([res.id]); else setError(res.error);
      } else if (via === 'type') {
        const res = await startTextSourceAction({ workspace: 'khumalo', name, text, staffOnly });
        if (res.ok) setStarted([res.id]); else setError(res.error);
      } else {
        if (!files.length) { setError('Choose at least one file.'); return; }
        const fd = new FormData();
        fd.set('workspace', 'khumalo');
        fd.set('staffOnly', String(staffOnly));
        files.forEach((f) => fd.append('file', f));
        const r = await fetch('/admin/assistant/upload', { method: 'POST', body: fd });
        const res = (await r.json().catch(() => ({ ok: false, error: 'The upload didn’t go through. Please try again.' }))) as { ok: boolean; ids?: string[]; error?: string };
        if (res.ok && res.ids) setStarted(res.ids); else setError(res.error ?? 'The upload didn’t go through. Please try again.');
      }
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const reset = () => { setStarted(null); setUrl(''); setName(''); setText(''); setFiles([]); setError(''); };
  const go = via === 'website' ? 'Start reading' : via === 'upload' ? 'Upload and read' : 'Add and clean';

  return (
    <>
      <header className={a.topbar}>
        <div className={a.titleBox}>
          <Link className={a.crumb} href="/admin/assistant/sources">← Knowledge sources</Link>
          <h1 className={a.h1}>Add a source</h1>
        </div>
        <div className={a.actions}><Link className={`${a.btn} ${a.btnGhost}`} href="/admin/assistant/sources">{started ? 'Back to sources' : 'Cancel'}</Link></div>
      </header>

      <div className={s.page}>
        <div className={s.addGrid}>
          {started ? (
            <Progress ids={started} via={via} onAnother={reset} />
          ) : (
            <div className={s.addMain}>
              <div className={s.routePick} role="radiogroup" aria-label="How do you want to add it?">
                {ROUTES.map((r) => (
                  <button key={r.via} type="button" role="radio" aria-checked={via === r.via} className={s.pick} onClick={() => { setVia(r.via); setError(''); }}>
                    <span className={s.pickIco}><PathIcon d={r.icon} size={20} /></span>
                    <span><b>{r.title}</b><span>{r.text}</span></span>
                  </button>
                ))}
              </div>

              <form className={`${a.panel} ${s.form}`} onSubmit={submit} noValidate>
                {via === 'website' && (
                  <>
                    <label className={s.lbl} htmlFor="src-url">Web address</label>
                    <div className={s.urlRow}>
                      <input id="src-url" className={a.field} type="text" inputMode="url" autoComplete="off" placeholder="https://khumalosolar.example/services" value={url} onChange={(e) => setUrl(e.target.value)} aria-describedby="src-url-h" aria-invalid={!!error} />
                      <button type="submit" className={`${a.btn} ${a.btnPrimary}`} disabled={busy || !url.trim()}>{busy ? 'Checking…' : go}</button>
                    </div>
                    <span id="src-url-h" className={s.hint}>We read the text on the page. Pages behind a login can&apos;t be read.</span>
                    <label className={s.check}><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />Also read pages linked from this one on the same website (up to {MAX_PAGES} pages)</label>
                  </>
                )}

                {via === 'upload' && (
                  <>
                    <div
                      className={`${s.drop} ${drag ? s.dropOn : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={onDrop}
                      onClick={() => fileInput.current?.click()}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click(); } }}
                      aria-label="Choose files to upload"
                    >
                      <PathIcon d={UP} size={28} />
                      <b>Drop files here, or choose them</b>
                      <span className={s.hint}>PDF, Word (.docx) or text. Up to 5 files, 10 MB each. Scanned images can&apos;t be read.</span>
                      <input ref={fileInput} type="file" hidden multiple accept=".pdf,.docx,.txt,.md,.csv" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
                    </div>
                    {files.length > 0 && (
                      <ul className={s.files}>
                        {files.map((f, i) => (
                          <li key={`${f.name}-${i}`}><span>{f.name}</span><button type="button" className={a.iconBtnSm} aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><PathIcon d="M6 6l12 12M18 6L6 18" size={14} /></button></li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {via === 'type' && (
                  <>
                    <label className={s.lbl} htmlFor="src-name">Name</label>
                    <input id="src-name" className={a.field} type="text" maxLength={120} placeholder="For example: Opening hours" value={name} onChange={(e) => setName(e.target.value)} />
                    <label className={s.lbl} htmlFor="src-text">What should the assistant know?</label>
                    <textarea id="src-text" className={`${a.field} ${s.textarea}`} maxLength={60000} placeholder="Paste or type facts, prices and answers. Short paragraphs work best." value={text} onChange={(e) => setText(e.target.value)} />
                    <span className={s.hint}>Text you type is cleaned the same way, and you still approve it before it goes live.</span>
                  </>
                )}

                <Visibility value={staffOnly} onChange={setStaffOnly} />

                {error && (
                  <div className={s.err} role="alert"><PathIcon d={WARN} size={18} /><span>{error}</span></div>
                )}
                {via !== 'website' && (
                  <div><button type="submit" className={`${a.btn} ${a.btnPrimary}`} disabled={busy || (via === 'upload' ? !files.length : !text.trim() || !name.trim())}>{busy ? 'Working…' : go}</button></div>
                )}
              </form>
            </div>
          )}

          <aside className={s.aside}>
            <section className={`${a.panel} ${s.next}`} aria-labelledby="next-h">
              <h2 id="next-h">What happens next</h2>
              <ol>
                {STEPS.map((x, i) => (
                  <li key={x.t}><span>{i + 1}</span><span><b>{x.t}</b>{x.d}</span></li>
                ))}
              </ol>
            </section>
            <div className={s.aiNote}>
              <span className={s.ai}>AI CLEANED</span>
              <span>Anything AI rewrites is marked like this until you approve it. Customers never see unapproved items.</span>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
