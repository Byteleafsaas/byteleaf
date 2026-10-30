import 'server-only';
import { cache } from 'react';
import type { Project } from '@/lib/admin/types';
import { computeAvailability, type AvailabilityMap } from '@/lib/availability';
import { connectDB } from './db';
import { toProject } from './mappers';
import { Booking, Project as ProjectModel } from './models';
import { getPublicSettings, type PublicSettings } from './settings';

// If the database is unreachable the public site still renders, with the design's placeholders.
const FALLBACK: PublicSettings = {
  business: { publicEmail: '', phone: '', location: 'Johannesburg, South Africa', hours: '', replyWithin: '', urgentResponse: '', notifyEmail: '' },
  prices: { care: { text: '', unit: '' }, build: { text: '', unit: '' }, fix: { text: '', unit: '' }, team: { text: '', unit: '' }, includedHours: '' },
  availability: { workingDays: [], startTimes: [], meetingTypes: [], minNotice: '', bufferMin: '', maxPerDay: 4, blocked: [] },
};

export const getSite = cache(async (): Promise<PublicSettings> => {
  try {
    return await getPublicSettings();
  } catch (e) {
    console.error('[site] could not load settings, using placeholders:', (e as Error).message);
    return FALLBACK;
  }
});

/** Live projects for the public pages, featured first. */
export async function getLiveProjects(): Promise<Project[]> {
  try {
    await connectDB();
    const rows = await ProjectModel.find({ live: true, deletedAt: null }).sort({ featured: -1, sortOrder: 1, createdAt: 1 }).lean();
    return rows.map(toProject);
  } catch (e) {
    console.error('[site] could not load projects:', (e as Error).message);
    return [];
  }
}

/** Free slots for the next 90 days, for the public booking page. */
export async function getBookingAvailability(): Promise<{ availability: AvailabilityMap; types: PublicSettings['availability']['meetingTypes'] }> {
  const site = await getSite();
  try {
    await connectDB();
    const active = await Booking.find({ status: { $in: ['pending', 'confirmed', 'rescheduled'] } }).select('date time durationMin').lean();
    return { availability: computeAvailability(site.availability, active, { days: 90 }), types: site.availability.meetingTypes.filter((m) => m.enabled) };
  } catch (e) {
    console.error('[site] could not load availability:', (e as Error).message);
    return { availability: {}, types: [] };
  }
}
