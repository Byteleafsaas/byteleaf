// The sample site's content, as the owner's admin edits it (HANDOFF-LAUNCH §3 and §5). Plain data, no database,
// so the rules for editing, validating, publishing and undoing can be tested on their own.

export type PageKey = 'home' | 'services' | 'about' | 'gallery' | 'contact';
export const PAGES: PageKey[] = ['home', 'services', 'about', 'gallery', 'contact'];
export const PAGE_NAMES: Record<PageKey, string> = { home: 'Home', services: 'Services and prices', about: 'About', gallery: 'Gallery', contact: 'Contact' };

export type ButtonTarget = 'contact' | 'whatsapp' | 'call';
export type LinkTo = 'services' | 'photos' | 'settings';

/** The fixed blocks of a page. The owner edits what is inside them; the layout, colours and type stay ours. */
export type Block =
  | { id: string; type: 'heading'; label: string; value: string; max: number; help: string }
  | { id: string; type: 'text'; label: string; value: string; max: number; help: string }
  | { id: string; type: 'button'; label: string; value: string; target: ButtonTarget; max: number; help: string }
  | { id: string; type: 'image'; label: string; value: string; help: string }
  | { id: string; type: 'section'; label: string; on: boolean; desc: string }
  | { id: string; type: 'link'; label: string; desc: string; to: LinkTo; toLabel: string }
  /** Areas served: the same list as Site settings, so there is only one copy of it. */
  | { id: string; type: 'list'; label: string; maxItems: number; itemMax: number; itemName: string; help: string };

export type Service = {
  id: string;
  name: string;
  /** Whole rands. null means "Ask for a price". */
  price: number | null;
  time: string;
  summary: string;
  /** What's included, at most six lines. */
  included: string[];
  /** The "On the site" switch. */
  visible: boolean;
};

export type Photo = {
  id: string;
  /** A sample photo is drawn, with a "Sample photo" chip. An upload is a real file stored under `key`. */
  kind: 'sample' | 'upload';
  key?: string;
  alt: string;
  /** Width in pixels, to warn about photos too small to look good as the main photo. */
  w: number;
  on: { home: boolean; about: boolean; gallery: boolean };
  caption: string;
};

export type Hours = { weekdays: string; saturday: string; sunday: string };
export type Settings = {
  name: string;
  description: string;
  phone: string;
  whatsapp: string;
  whatsappSame: boolean;
  email: string;
  areas: string[];
  hours: Hours;
  instagram: string;
  facebook: string;
};

export type Snapshot = { pages: Record<PageKey, Block[]>; services: Service[]; photos: Photo[]; settings: Settings };

/** The whole site as stored: what customers see, what the owner has saved as a draft, and the version before the last publish. */
export type SiteState = {
  live: Snapshot;
  saved: Snapshot;
  liveVersion: number;
  liveAt: string;
  /** The live version before the last publish, kept so Undo can put it back. */
  previous: { snapshot: Snapshot; version: number; at: string } | null;
};

export type Change = { id: string; label: string };
