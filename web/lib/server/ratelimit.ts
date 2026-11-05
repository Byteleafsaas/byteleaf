import 'server-only';
import { connectDB } from './db';
import { RateLimit } from './models';

/**
 * Fixed-window rate limit. Kept apart from `auth.ts` so scripts and the booking engine can use it without loading Next's request code.
 * One atomic update both starts a new window and counts, so a burst of requests at the moment a window ends can't each
 * reset the count to 1 (which would let them all through).
 */
export async function rateLimit(key: string, max = 5, windowMs = 15 * 60000): Promise<boolean> {
  await connectDB();
  const now = new Date();
  const fresh = new Date(now.getTime() + windowMs);
  const update = [
    { $set: { count: { $cond: [{ $gt: ['$resetAt', now] }, { $add: [{ $ifNull: ['$count', 0] }, 1] }, 1] }, resetAt: { $cond: [{ $gt: ['$resetAt', now] }, '$resetAt', fresh] } } },
  ];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const doc = await RateLimit.findOneAndUpdate({ key }, update, { upsert: true, returnDocument: 'after', updatePipeline: true });
      return (doc?.count ?? 1) <= max;
    } catch (e) {
      // Two first requests for a new key can both try to create it; the loser just counts against the winner's row.
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  return true;
}
