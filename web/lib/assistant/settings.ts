// What an owner can change about their assistant (Assistant settings). Shared by the form and the server.
import { z } from 'zod';
import { isHex } from './contrast';
import { DEFAULT_HOURS, hoursSchema } from './hours';
import type { WorkspaceId } from './workspaces';

export const AVATARS = ['logo', 'initial', 'ai'] as const;
export const TONES = ['friendly', 'professional', 'brief'] as const;
export const REPLY_TIMES = ['Within 2 working hours', 'Within 1 working day', 'Within 2 working days'] as const;
export const RETENTION_OPTIONS = [7, 30, 90] as const;

export const TONE_HELP: Record<(typeof TONES)[number], string> = {
  friendly: 'Warm and plain. Short sentences, no jargon.',
  professional: 'Polite and precise. Complete sentences, no slang.',
  brief: 'As short as possible. Just the answer.',
};

export const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Give the assistant a name.').max(60, 'Keep the name under 60 characters.'),
  avatar: z.enum(AVATARS),
  greeting: z.string().trim().min(5, 'Add a first message for customers.').max(160, 'Keep the first message under 160 characters.'),
  brand: z.string().trim().refine(isHex, 'Enter a colour like #166FE5.'),
  tone: z.enum(TONES),
  refused: z.array(z.string().trim().min(2).max(60)).max(20),
  talk: z.object({
    enabled: z.boolean(),
    phone: z.boolean(),
    email: z.boolean(),
    suburb: z.boolean(),
    sendTo: z.string().trim().max(200),
    replyTime: z.enum(REPLY_TIMES),
  }),
  hours: hoursSchema,
  privacyUrl: z.string().trim().max(300),
  retentionDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
});
export type AssistantSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Record<WorkspaceId, AssistantSettings> = {
  khumalo: {
    name: 'Khumalo assistant',
    avatar: 'logo',
    greeting: "Hi, I'm the Khumalo Home Solar assistant. I can help with packages, prices, installation and warranty. What would you like to know?",
    brand: '#166FE5',
    tone: 'friendly',
    refused: ['Discounts', 'Legal advice', 'Electrical fault diagnosis', 'Competitor pricing'],
    talk: { enabled: true, phone: true, email: true, suburb: false, sendTo: '', replyTime: 'Within 1 working day' },
    hours: DEFAULT_HOURS,
    privacyUrl: '',
    retentionDays: 30,
  },
};

const GENERIC = new Set(['advice', 'pricing', 'price', 'prices', 'help', 'info', 'information', 'questions', 'question', 'about', 'on', 'and', 'the', 'of']);

/** 'Legal advice' -> legal, 'Electrical fault diagnosis' -> diagnos, 'Competitor pricing' -> competitor. */
export function topicStem(topic: string): string {
  const words = topic.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !GENERIC.has(w));
  const last = words[words.length - 1] ?? '';
  return last.replace(/(is|es|s)$/, '').slice(0, 24);
}

const BASE_REFUSED = ['tax', 'lawyer', 'legal', 'sue', 'medical', 'doctor', 'diagnos', 'invest', 'stock', 'shares', 'crypto', 'bitcoin', 'politic', 'election'];

/** A pattern that catches questions on the topics an owner wants handed over, on top of the built-in ones. */
export function refusedPattern(topics: string[]): RegExp {
  const stems = new Set([...BASE_REFUSED, ...topics.map(topicStem).filter((s) => s.length >= 3)]);
  return new RegExp(`\\b(${[...stems].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\w*`, 'i');
}

export const RETENTION_LABEL = (d: number) => `${d} days`;
