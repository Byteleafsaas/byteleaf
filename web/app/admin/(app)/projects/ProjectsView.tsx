'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ICON, PathIcon } from '@/components/admin/icons';
import { PillTabs, SearchBox, Switch, TopBar } from '@/components/admin/Ui';
import s from '@/components/admin/admin.module.css';
import p from '@/components/admin/projects.module.css';
import { useAdmin } from '@/lib/admin/store';
import type { Project } from '@/lib/admin/types';
import { deleteProjectAction, featureProjectAction, restoreProjectAction, setProjectLiveAction } from '@/lib/server/actions/projects';

type Tab = 'all' | 'live' | 'draft';
const GROUPS: Record<Tab, (x: Project) => boolean> = { all: () => true, live: (x) => x.live, draft: (x) => !x.live };
const TABS: [Tab, string][] = [['all', 'All'], ['live', 'On website'], ['draft', 'Hidden']];

const STAR = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z';

export default function ProjectsView() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { projects, setProjects, notify, refresh } = useAdmin();
  const sync = (p: Promise<{ ok: boolean }>) => void p.then((r) => { if (!r.ok) notify('That change could not be saved.'); refresh(); });
  const router = useRouter();
  const params = useSearchParams();
  const t = params.get('tab') as Tab | null;
  const tab: Tab = t && t in GROUPS ? t : 'all';
  const [q, setQ] = useState('');

  const term = q.trim().toLowerCase();
  const rows = projects.filter(GROUPS[tab]).filter((x) => !term || `${x.name} ${x.type}`.toLowerCase().includes(term));

  const toggleLive = (x: Project) => {
    setProjects((all) => all.map((y) => (y.id === x.id ? { ...y, live: !y.live, updated: 'Just now' } : y)));
    notify(x.live ? `${x.name} is now hidden from the website.` : `${x.name} is now live on the website.`);
    sync(setProjectLiveAction(x.id, !x.live));
  };
  // Exactly one featured project: starring another moves it.
  const feature = (x: Project) => {
    setProjects((all) => all.map((y) => ({ ...y, featured: y.id === x.id })));
    notify(`${x.name} is now the featured project.`);
    sync(featureProjectAction(x.id));
  };
  // Soft delete on the server (deletedAt), so Undo can restore it.
  const remove = (x: Project) => {
    const index = projects.findIndex((y) => y.id === x.id);
    setProjects((all) => all.filter((y) => y.id !== x.id));
    sync(deleteProjectAction(x.id));
    notify(`${x.name} deleted.`, () => {
      setProjects((all) => {
        const next = all.slice();
        next.splice(index, 0, x);
        return next;
      });
      sync(restoreProjectAction(x.id));
    });
  };

  return (
    <>
      <TopBar crumb="Admin / Projects" title="Projects">
        <SearchBox label="Search projects" placeholder="Search projects…" value={q} onChange={setQ} />
        <Link className={`${s.btn} ${s.btnPrimary}`} href="/admin/projects/new">
          <PathIcon d={ICON.plus} sw={2.2} />
          Add project
        </Link>
      </TopBar>

      <div className={s.content}>
        <div className={p.bar}>
          <PillTabs label="Filter projects" value={tab} onChange={(k) => router.replace(`/admin/projects?tab=${k}`)} tabs={TABS.map(([key, label]) => ({ key, label, count: projects.filter(GROUPS[key]).length }))} />
          <span className={p.note}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#C27C0E" aria-hidden="true"><path d={STAR} /></svg>
            Featured project shows first on the Projects page
          </span>
        </div>

        <section className={`${s.panel} ${s.rise} ${s.ov}`} aria-label="Project list">
          <div className={p.thead}>
            <span style={{ flex: '1 1 260px' }}>PROJECT</span>
            <span style={{ width: 190 }}>CATEGORIES</span>
            <span style={{ width: 120 }}>ON WEBSITE</span>
            <span style={{ width: 96 }}>UPDATED</span>
            <span style={{ width: 128, textAlign: 'right' }}>ACTIONS</span>
          </div>
          <ul className={s.ul}>
            {rows.map((x) => (
              <li key={x.id} className={p.prow}>
                <div className={p.pmain}>
                  <span aria-hidden="true" className={p.thumbWrap} style={{ position: 'relative' }}>{x.cover ? <Image src={`/media/${x.cover.key}`} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} /> : <span className={`${p.thumb} ${p[`p${x.pattern}`]}`} />}</span>
                  <span className={p.ptext}>
                    <span className={p.pname}>{x.name}{x.featured && <span className={p.feat}>FEATURED</span>}</span>
                    <span className={p.psub}>{x.type} · {x.client}</span>
                  </span>
                </div>
                <div className={p.pcats}>{x.categories.map((c) => <span key={c} className={p.pcat}>{c}</span>)}</div>
                <div className={p.plive}>
                  <Switch checked={x.live} onChange={() => toggleLive(x)} label={`Show ${x.name} on website`} />
                  <span className={p.liveLbl} style={{ color: x.live ? '#0B6B4B' : 'var(--muted)' }}>{x.live ? 'Visible' : 'Hidden'}</span>
                </div>
                <span className={p.upd}>{x.updated}</span>
                <div className={p.pacts}>
                  <button type="button" className={p.star} aria-pressed={x.featured} aria-label={`Make ${x.name} the featured project`} onClick={() => feature(x)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={x.featured ? '#C27C0E' : 'none'} stroke={x.featured ? '#C27C0E' : '#6B7891'} strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d={STAR} /></svg>
                  </button>
                  <Link className={p.act} href={`/admin/projects/${x.id}`} aria-label={`Edit ${x.name}`}>
                    <PathIcon d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </Link>
                  <button type="button" className={`${p.act} ${p.del}`} aria-label={`Delete ${x.name}`} onClick={() => remove(x)}>
                    <PathIcon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {rows.length === 0 && (
            <div className={s.emptyBox} style={{ gap: 12 }}>
              <strong>No projects here yet</strong>
              <Link className={`${s.btn} ${s.btnPrimary}`} href="/admin/projects/new">Add your first project</Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
