import 'server-only';
import { SITE_SLUG } from '@/lib/launch/defaults';
import { pending } from '@/lib/launch/engine';
import type { Change, SiteState } from '@/lib/launch/types';
import { connectDB } from '../db';
import { SiteEnquiry } from '../models';
import { getSite } from './store';

/** What the website admin's sidebar and publish bar need on every page. */
export async function loadWebsiteInfo(): Promise<{ name: string; pending: number; enquiries: number }> {
  await connectDB();
  const [{ state }, enquiries] = await Promise.all([getSite(), SiteEnquiry.countDocuments({ site: SITE_SLUG, status: 'new' })]);
  return { name: state.saved.settings.name, pending: pending(state).length, enquiries };
}

export type PublishInfo = { changes: Change[]; version: number; liveAt: string };

/** The saved draft and the list of changes waiting to be published, for any website admin screen. */
export async function loadWebsite(): Promise<{ state: SiteState; publish: PublishInfo }> {
  const { state } = await getSite();
  return { state, publish: { changes: pending(state), version: state.liveVersion, liveAt: state.liveAt } };
}
