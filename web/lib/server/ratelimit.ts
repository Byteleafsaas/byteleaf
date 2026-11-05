import 'server-only';
import { connectDB } from './db';
import { RateLimit } from './models';

/** Fixed-window rate limit. Kept apart from `auth.ts` so scripts and the booking engine can use it without loading Next's request code. */
export async function rateLimit(key: string, max = 5, windowMs = 15 * 60000): Promise<boolean> {
  await connectDB();
  const now = new Date();
  const doc = await RateLimit.findOneAndUpdate(
    { key, resetAt: { $gt: now } },
    { $inc: { count: 1 } },
    { new: true },
  );
  if (doc) return doc.count <= max;
  await RateLimit.findOneAndUpdate({ key }, { $set: { count: 1, resetAt: new Date(now.getTime() + windowMs) } }, { upsert: true });
  return true;
}
