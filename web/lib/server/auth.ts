import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from './db';
import { isProd } from './env';
import { AdminUser, PendingLogin, RateLimit, ResetToken, Session } from './models';

export const SESSION_COOKIE = 'bl_session';
const DAY = 86400000;
const PERSISTENT_MS = 30 * DAY; // "Keep me signed in": 30-day sliding expiry
const SHORT_MS = DAY; // browser-session cookie: server-side cap of 24h
export const RESET_MINUTES = 30;

export { hashPassword, verifyPassword, passwordProblems, newToken, hashToken } from './password';
import { hashToken, newToken } from './password';

/* ---------- request info ---------- */
export async function clientInfo() {
  const h = await headers();
  // A visitor can write anything in x-forwarded-for, but every proxy adds the address it saw to the END of it. So trust the
  // header Cloudflare sets itself, then the one our own proxy sets, then the last entry, never the first.
  const xff = h.get('x-forwarded-for')?.split(',').map((x) => x.trim()).filter(Boolean);
  const ip = h.get('cf-connecting-ip')?.trim() || h.get('x-real-ip')?.trim() || xff?.[xff.length - 1] || 'unknown';
  return { ip, userAgent: h.get('user-agent') ?? '' };
}

/* ---------- rate limiting (fixed window) ---------- */
export { rateLimit } from './ratelimit';

/* ---------- sessions ---------- */
export async function createSession(userId: string, persistent: boolean) {
  await connectDB();
  const token = newToken();
  const { ip, userAgent } = await clientInfo();
  const ttl = persistent ? PERSISTENT_MS : SHORT_MS;
  await Session.create({ userId, tokenHash: hashToken(token), persistent, expiresAt: new Date(Date.now() + ttl), ip, userAgent });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    ...(persistent ? { maxAge: ttl / 1000 } : {}), // no maxAge = browser-session cookie
  });
}

export type CurrentAdmin = { id: string; name: string; email: string; sessionId: string; twoStep: boolean };

export async function getAdmin(): Promise<CurrentAdmin | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await AdminUser.findById(session.userId);
  if (!user) return null;
  // Sliding expiry for persistent sessions: refresh at most once a day.
  if (session.persistent && session.expiresAt.getTime() - Date.now() < PERSISTENT_MS - DAY) {
    session.expiresAt = new Date(Date.now() + PERSISTENT_MS);
    await session.save();
  }
  return { id: String(user._id), name: user.name, email: user.email, sessionId: String(session._id), twoStep: !!user.twoStepEnabled };
}

/** For pages and layouts: send unauthenticated visitors to sign-in. */
export async function requireAdmin(next?: string): Promise<CurrentAdmin> {
  const admin = await getAdmin();
  if (!admin) redirect(`/admin/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  return admin;
}

/** For Server Actions and route handlers: throw instead of redirecting. */
export async function assertAdmin(): Promise<CurrentAdmin> {
  const admin = await getAdmin();
  if (!admin) throw new Error('UNAUTHORIZED');
  return admin;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: hashToken(token) });
  }
  store.delete(SESSION_COOKIE);
}

export async function destroyOtherSessions(userId: string, keepSessionId: string) {
  await connectDB();
  const r = await Session.deleteMany({ userId, _id: { $ne: keepSessionId } });
  return r.deletedCount ?? 0;
}

/* ---------- password reset ---------- */
export async function createResetToken(userId: string) {
  await connectDB();
  const token = newToken();
  await ResetToken.create({ userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60000) });
  return token;
}

export async function findValidResetToken(token: string) {
  if (!token) return null;
  await connectDB();
  return ResetToken.findOne({ tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } });
}

/* ---------- two-step: the pending-login step between password and session ---------- */
export const PENDING_COOKIE = 'bl_2fa';
const PENDING_MS = 5 * 60000;

export async function createPendingLogin(userId: string, remember: boolean, next: string) {
  await connectDB();
  const token = newToken();
  await PendingLogin.create({ userId, tokenHash: hashToken(token), remember, next, expiresAt: new Date(Date.now() + PENDING_MS) });
  (await cookies()).set(PENDING_COOKIE, token, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: PENDING_MS / 1000 });
}

export async function getPendingLogin() {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  return PendingLogin.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
}

export async function clearPendingLogin() {
  const store = await cookies();
  const token = store.get(PENDING_COOKIE)?.value;
  if (token) {
    await connectDB();
    await PendingLogin.deleteOne({ tokenHash: hashToken(token) });
  }
  store.delete(PENDING_COOKIE);
}
