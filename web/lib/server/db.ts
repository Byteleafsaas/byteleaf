import 'server-only';
import mongoose from 'mongoose';
import { env } from './env';

// Cache the connection across hot reloads in dev and across invocations in prod.
const g = globalThis as unknown as { _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } };
const cache = (g._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }
  return cache.conn;
}
