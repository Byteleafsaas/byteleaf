import 'server-only';
import { defaultState, SITE_SLUG } from '@/lib/launch/defaults';
import type { SiteState } from '@/lib/launch/types';
import { connectDB } from '../db';
import { SiteDoc } from '../models';

/** The sample site's content, created with its starting copy the first time it is asked for. */
export async function getSite(): Promise<{ state: SiteState; rev: number }> {
  await connectDB();
  const found = await SiteDoc.findOne({ slug: SITE_SLUG }).lean();
  if (found) return { state: found.state as SiteState, rev: found.rev };
  try {
    await SiteDoc.create({ slug: SITE_SLUG, state: defaultState(), rev: 0 });
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) throw e; // another request created it first
  }
  const made = (await SiteDoc.findOne({ slug: SITE_SLUG }).lean())!;
  return { state: made.state as SiteState, rev: made.rev };
}

/** What customers see: the published version. */
export const getLive = async () => (await getSite()).state.live;

export type Mutation<T> = { state: SiteState; result: T } | { error: string };

/**
 * Reads the site, lets `fn` change it, and writes it back only if nobody else changed it in the meantime (`rev`).
 * Two edits at the same moment can't overwrite each other: the second one re-reads and applies itself again.
 */
export async function mutate<T>(fn: (s: SiteState) => Mutation<T> | Promise<Mutation<T>>): Promise<{ ok: true; state: SiteState; result: T } | { ok: false; error: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { state, rev } = await getSite();
    const m = await fn(state);
    if ('error' in m) return { ok: false, error: m.error };
    const wrote = await SiteDoc.updateOne({ slug: SITE_SLUG, rev }, { $set: { state: m.state }, $inc: { rev: 1 } });
    if (wrote.modifiedCount) return { ok: true, state: m.state, result: m.result };
  }
  return { ok: false, error: 'The site changed while you were saving. Please try again.' };
}
