'use server';

import { z } from 'zod';
import { assertAdmin, clientInfo, createPendingLogin, createResetToken, createSession, destroyCurrentSession, destroyOtherSessions, findValidResetToken, passwordProblems, RESET_MINUTES, hashPassword, rateLimit, verifyPassword } from '../auth';
import { connectDB } from '../db';
import { mail } from '../emails';
import { env } from '../env';
import { AdminUser, Session } from '../models';

const emailSchema = z.string().trim().toLowerCase().email().max(200);

// Verified against when the email is unknown so response time doesn't leak whether the account exists.
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword('not-a-real-password-0!'));

const GENERIC = "That email and password don't match. Check them and try again.";

export async function loginAction(input: { email: string; password: string; remember: boolean; next?: string }): Promise<{ ok: true; twoStep: false; next: string } | { ok: true; twoStep: true } | { ok: false; error: string }> {
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success || !input.password) return { ok: false, error: GENERIC };
  const email = parsed.data;
  const { ip } = await clientInfo();

  // 5 attempts per 15 minutes, per IP and per email.
  const [byIp, byEmail] = await Promise.all([rateLimit(`login:ip:${ip}`), rateLimit(`login:email:${email}`)]);
  if (!byIp || !byEmail) return { ok: false, error: 'Too many attempts. Please wait 15 minutes and try again.' };

  await connectDB();
  const user = await AdminUser.findOne({ email });
  const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash()), input.password);
  if (!user || !valid) return { ok: false, error: GENERIC };

  const next = input.next && input.next.startsWith('/admin') && !input.next.startsWith('//') ? input.next : '/admin';
  // Two-step on: the password alone does not create a session. It only starts a short-lived pending login.
  if (user.twoStepEnabled) {
    await createPendingLogin(String(user._id), !!input.remember, next);
    return { ok: true, twoStep: true };
  }
  await createSession(String(user._id), !!input.remember);
  return { ok: true, twoStep: false, next };
}

export async function logoutAction() {
  await destroyCurrentSession();
}

/** Always answers the same way whether or not the address belongs to an admin. */
export async function forgotPasswordAction(rawEmail: string): Promise<{ ok: true }> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: true };
  const email = parsed.data;
  const { ip } = await clientInfo();
  const [byIp, byEmail] = await Promise.all([rateLimit(`forgot:ip:${ip}`), rateLimit(`forgot:email:${email}`)]);
  if (!byIp || !byEmail) return { ok: true };

  await connectDB();
  const user = await AdminUser.findOne({ email });
  if (user) {
    const token = await createResetToken(String(user._id));
    await mail.passwordReset(user.email, `${env.APP_URL}/admin/reset-password?token=${encodeURIComponent(token)}`, RESET_MINUTES);
  }
  return { ok: true };
}

export async function resetPasswordAction(token: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const problems = passwordProblems(password);
  if (problems.length) return { ok: false, error: `Password needs ${problems.join(', ')}.` };
  const rec = await findValidResetToken(token);
  if (!rec) return { ok: false, error: 'This reset link is invalid or has expired. Ask for a new one.' };

  await AdminUser.updateOne({ _id: rec.userId }, { $set: { passwordHash: await hashPassword(password) } });
  rec.usedAt = new Date(); // single-use
  await rec.save();
  await Session.deleteMany({ userId: rec.userId }); // revoke ALL sessions
  return { ok: true };
}

export async function signOutOthersAction(): Promise<{ ok: true; count: number }> {
  const admin = await assertAdmin();
  const count = await destroyOtherSessions(admin.id, admin.sessionId);
  return { ok: true, count };
}

export async function verifyCurrentPassword(password: string) {
  const admin = await assertAdmin();
  const user = await AdminUser.findById(admin.id);
  return !!user && (await verifyPassword(user.passwordHash, password));
}
