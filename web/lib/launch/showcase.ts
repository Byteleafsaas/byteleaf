// The scripted stories on the showcase page (HANDOFF-LAUNCH §7). A plain reducer, so the path through each story can be tested.

export type StoryKey = 'enquiry' | 'price' | 'photos';
export const STORY_ORDER: StoryKey[] = ['enquiry', 'price', 'photos'];
export type View = 'site' | 'admin';
export type Screen = 'home' | 'contact' | 'sent' | 'services' | 'gallery' | 'enquiries' | 'list' | 'editor' | 'listPub' | 'photosEmpty' | 'photosAdded';

/** What each step shows, and which button on it moves the story on (null: use Next step). */
export const SCRIPT: Record<StoryKey, { screen: Screen; target: string | null }[]> = {
  enquiry: [{ screen: 'home', target: 'book' }, { screen: 'contact', target: 'send' }, { screen: 'sent', target: null }, { screen: 'enquiries', target: null }],
  price: [{ screen: 'list', target: 'row' }, { screen: 'editor', target: 'save' }, { screen: 'listPub', target: 'publish' }, { screen: 'services', target: null }],
  photos: [{ screen: 'photosEmpty', target: 'upload' }, { screen: 'photosAdded', target: 'publish' }, { screen: 'gallery', target: null }],
};

export const viewOf = (s: Screen): View => (['home', 'contact', 'sent', 'services', 'gallery'].includes(s) ? 'site' : 'admin');

export type State = { view: View; story: StoryKey | null; step: number; finished: boolean; hint: boolean };
export type Action = { t: 'view'; view: View } | { t: 'pick'; story: StoryKey } | { t: 'next' } | { t: 'restart' } | { t: 'tap'; target: string } | { t: 'off' } | { t: 'clearHint' };

export const initial: State = { view: 'site', story: null, step: 0, finished: false, hint: false };

export function reducer(s: State, a: Action): State {
  switch (a.t) {
    case 'view': return { ...initial, view: a.view };
    case 'pick': return { view: viewOf(SCRIPT[a.story][0].screen), story: a.story, step: 0, finished: false, hint: false };
    case 'restart': return s.story ? reducer(s, { t: 'pick', story: s.story }) : initial;
    case 'next': {
      if (!s.story || s.finished) return s;
      const last = SCRIPT[s.story].length - 1;
      if (s.step >= last) return { ...s, finished: true, hint: false };
      const step = s.step + 1;
      return { ...s, step, view: viewOf(SCRIPT[s.story][step].screen), hint: false };
    }
    case 'tap': return s.story && !s.finished && SCRIPT[s.story][s.step].target === a.target ? reducer(s, { t: 'next' }) : { ...s, hint: Boolean(s.story) };
    case 'off': return s.story ? { ...s, hint: true } : s;
    case 'clearHint': return { ...s, hint: false };
  }
}

/** The screen to draw now. With no story, the browsable idle screens. */
export function currentScreen(s: State): Screen {
  if (!s.story) return s.view === 'site' ? 'home' : 'list';
  return SCRIPT[s.story][s.step].screen;
}

export const nextStory = (k: StoryKey): StoryKey | null => STORY_ORDER[STORY_ORDER.indexOf(k) + 1] ?? null;
