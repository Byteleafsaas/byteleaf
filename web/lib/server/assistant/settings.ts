import 'server-only';
import { themeFromBrand } from '@/lib/assistant/contrast';
import { DEFAULT_SETTINGS, REPLY_TIMES, type AssistantSettings } from '@/lib/assistant/settings';
import { WORKSPACES, type PublicWorkspace, type WorkspaceId } from '@/lib/assistant/workspaces';
import { connectDB } from '../db';
import { AssistantSettingsModel } from '../models';

/** The owner's settings, with anything they haven't set filled in from the defaults. */
export async function getAssistantSettings(workspace: WorkspaceId): Promise<AssistantSettings> {
  await connectDB();
  const doc = await AssistantSettingsModel.findOne({ workspace }).lean();
  const d = DEFAULT_SETTINGS[workspace];
  if (!doc) return d;
  const talk = doc.talk ?? {};
  return {
    name: doc.name || d.name,
    avatar: (doc.avatar as AssistantSettings['avatar']) || d.avatar,
    greeting: doc.greeting || d.greeting,
    brand: doc.brand || d.brand,
    tone: (doc.tone as AssistantSettings['tone']) || d.tone,
    refused: doc.refused?.length || doc.refused?.length === 0 ? [...doc.refused] : d.refused,
    talk: {
      enabled: talk.enabled ?? d.talk.enabled, phone: talk.phone ?? d.talk.phone, email: talk.email ?? d.talk.email, suburb: talk.suburb ?? d.talk.suburb,
      sendTo: talk.sendTo ?? d.talk.sendTo, replyTime: (REPLY_TIMES as readonly string[]).includes(talk.replyTime ?? '') ? (talk.replyTime as AssistantSettings['talk']['replyTime']) : d.talk.replyTime,
    },
    privacyUrl: doc.privacyUrl ?? d.privacyUrl,
    retentionDays: ([7, 30, 90] as number[]).includes(doc.retentionDays ?? 0) ? (doc.retentionDays as AssistantSettings['retentionDays']) : d.retentionDays,
  };
}

/** The assistant as a visitor sees it: the business's fixed details plus the owner's settings. */
export function toPublicWorkspace(workspace: WorkspaceId, s: AssistantSettings): PublicWorkspace {
  const base = WORKSPACES[workspace];
  return {
    ...base,
    botName: s.name,
    greeting: s.greeting,
    launcherLabel: `Open chat with the ${s.name}`,
    handoverNote: `A person at ${base.business} will reply, ${s.talk.replyTime.charAt(0).toLowerCase()}${s.talk.replyTime.slice(1)}.`,
    theme: themeFromBrand(s.brand),
    avatar: s.avatar,
    talkToPerson: s.talk.enabled,
    form: { phone: s.talk.phone, email: s.talk.email, suburb: s.talk.suburb },
    privacyHref: s.privacyUrl || undefined,
  };
}

export async function loadPublicWorkspace(workspace: WorkspaceId): Promise<PublicWorkspace> {
  return toPublicWorkspace(workspace, await getAssistantSettings(workspace));
}
