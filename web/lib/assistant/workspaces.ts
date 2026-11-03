// Public, client-safe description of an assistant: its name, greeting and look. No secrets here.
// A real client's workspace will come from the database (Assistant settings); the demo one lives in code.

export type ThemeName = 'byteleaf' | 'warm' | 'dark';

/** The only values a client changes about the widget's look (HANDOFF-CHATBOT §3). */
export type Theme = { accent: string; onAccent: string; accentSoft: string; surface: string; text: string; muted: string; border: string; bubble: string };

export const THEMES: Record<ThemeName, Theme> = {
  byteleaf: { accent: '#166FE5', onAccent: '#FFFFFF', accentSoft: '#EEF4FE', surface: '#FFFFFF', text: '#0B1220', muted: '#4B5872', border: '#E3E9F2', bubble: '#F2F5F9' },
  warm: { accent: '#B4471A', onAccent: '#FFFFFF', accentSoft: '#FBEDE6', surface: '#FFFCF8', text: '#2A1A12', muted: '#6B5446', border: '#EADCD2', bubble: '#F6EEE7' },
  dark: { accent: '#3DDC97', onAccent: '#06231A', accentSoft: '#12352A', surface: '#12161C', text: '#F2F4F7', muted: '#A3ADBD', border: '#262D38', bubble: '#1B212A' },
};

export type WorkspaceId = 'khumalo';

export type PublicWorkspace = {
  id: WorkspaceId;
  business: string;
  botName: string;
  subtitle: string;
  greeting: string;
  placeholder: string;
  nudge: { title: string; text: string };
  launcherLabel: string;
  suggestions: string[];
  /** Shortcuts offered when someone asks about something the assistant won't answer. */
  topics: string[];
  handoverNote: string;
  /** Set from Assistant settings. Without it the named theme is used. */
  theme?: Theme;
  avatar?: 'logo' | 'initial' | 'ai';
  talkToPerson?: boolean;
  /** Which details the hand-over form asks for besides the name. */
  form?: { phone: boolean; email: boolean; suburb: boolean };
  privacyHref?: string;
};

export const WORKSPACES: Record<WorkspaceId, PublicWorkspace> = {
  khumalo: {
    id: 'khumalo',
    business: 'Khumalo Home Solar',
    botName: 'Khumalo assistant',
    subtitle: "Answers from Khumalo's own info",
    greeting: "Hi, I'm the Khumalo Home Solar assistant. I can help with packages, prices, installation and warranty. What would you like to know?",
    placeholder: 'Ask about packages, prices, warranty…',
    nudge: { title: 'Questions about going solar?', text: 'Ask me about packages, prices and warranty.' },
    launcherLabel: 'Open chat with the Khumalo assistant',
    suggestions: ['Do you install batteries as well as panels?', 'How much does a home system cost?', 'What warranty do I get?', 'Can I pay it off monthly?'],
    topics: ['Do you install batteries as well as panels?', 'How much does a home system cost?', 'What warranty do I get?'],
    handoverNote: 'A person at Khumalo Home Solar will reply, usually within [X business hours].',
  },
};

export function isWorkspaceId(v: unknown): v is WorkspaceId {
  return typeof v === 'string' && v in WORKSPACES;
}

/** What the server sends back for one question. */
export type AnswerKind = 'answer' | 'unknown' | 'off' | 'chat' | 'handover' | 'ratelimit' | 'error';
export type AnswerSource = { id: string; title: string; passage: string; /** From a staff-only source: shown with a lock. */ staff?: boolean };
export type Answer = {
  kind: AnswerKind;
  text: string;
  list?: string[];
  link?: { label: string; href: string };
  sources: AnswerSource[];
  waitSeconds?: number;
  /** Id of the saved assistant message, so a rating can be attached to it. */
  mid?: string;
};

/** How long chats are kept unless the owner changes it in Assistant settings. */
export const DEFAULT_RETENTION_DAYS = 30;
