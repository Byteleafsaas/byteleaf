import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { WorkspaceId } from '@/lib/assistant/workspaces';
import { env, isProd } from '../env';

// Staff sign-in for the staff assistant: a work email gets a one-time link, which sets a short-lived signed cookie.
// There is no password. The link and cookie are signed with the server's secret and carry no database state.

export const STAFF_COOKIE = 'bl_staff';
export const STAFF_DOMAIN: Record<WorkspaceId, string> = { khumalo: 'khumalosolar.co.za' };
const LINK_MINUTES = 15;
const SESSION_HOURS = 8;

export type Staff = { email: string; name: string; workspace: WorkspaceId };

const secret = () => {
  if (env.TOTP_ENCRYPTION_KEY) return env.TOTP_ENCRYPTION_KEY;
  // With no key anyone could forge a staff cookie or sign-in link, so production refuses to run without one.
  if (isProd) throw new Error('TOTP_ENCRYPTION_KEY is not set, so staff sign-in is switched off.');
  return 'dev-only-staff-secret';
};
const sign = (body: string) => createHmac('sha256', secret()).update(body).digest('base64url');

function pack(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function unpack<T>(token: string): T | null {
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const want = Buffer.from(sign(body));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as T;
  } catch {
    return null;
  }
}

/** 'sipho.mokoena@x.co.za' -> 'Sipho Mokoena'. */
export const nameFromEmail = (email: string) =>
  email.split('@')[0].split(/[._-]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') || 'Staff';

export const emailAllowed = (workspace: WorkspaceId, email: string) => email.toLowerCase().endsWith(`@${STAFF_DOMAIN[workspace]}`) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const linkToken = (workspace: WorkspaceId, email: string) => pack({ k: 'link', w: workspace, e: email.toLowerCase(), x: Date.now() + LINK_MINUTES * 60000 });

/** Checks a sign-in link and returns the cookie value for a session, or null. */
export function sessionFromLink(token: string): string | null {
  const p = unpack<{ k: string; w: WorkspaceId; e: string; x: number }>(token);
  if (!p || p.k !== 'link' || p.x < Date.now() || !(p.w in STAFF_DOMAIN) || !emailAllowed(p.w, p.e)) return null;
  return pack({ k: 'session', w: p.w, e: p.e, x: Date.now() + SESSION_HOURS * 3600000 });
}

export async function setStaffCookie(value: string) {
  (await cookies()).set(STAFF_COOKIE, value, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: SESSION_HOURS * 3600 });
}

export async function clearStaffCookie() {
  (await cookies()).delete(STAFF_COOKIE);
}

/** The signed-in staff member, if any. */
export async function getStaff(): Promise<Staff | null> {
  const v = (await cookies()).get(STAFF_COOKIE)?.value;
  const p = v ? unpack<{ k: string; w: WorkspaceId; e: string; x: number }>(v) : null;
  if (!p || p.k !== 'session' || p.x < Date.now() || !(p.w in STAFF_DOMAIN)) return null;
  return { email: p.e, name: nameFromEmail(p.e), workspace: p.w };
}
