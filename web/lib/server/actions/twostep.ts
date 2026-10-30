'use server';

import QRCode from 'qrcode';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { assertAdmin, clearPendingLogin, createSession, getPendingLogin, rateLimit, verifyPassword } from '../auth';
import { connectDB } from '../db';
import { env } from '../env';
import { AdminUser } from '../models';
import { decryptSecret, encryptSecret, generateBackupCodes, hashBackup, newTotp, verifyTotp } from '../totp';

type Fail = { ok: false; error: string };
const codeSchema = z.string().trim().min(6).max(32);

const enc = (s: string) => encryptSecret(s, env.TOTP_ENCRYPTION_KEY);
const dec = (s: string) => decryptSecret(s, env.TOTP_ENCRYPTION_KEY);

/** The shared check for a TOTP code or an unused backup code. Marks the code used on success. */
async function checkSecondFactor(userId: string, input: string): Promise<boolean> {
  const user = await AdminUser.findById(userId);
  if (!user?.twoStepEnabled || !user.totpSecretEnc) return false;
  const step = verifyTotp(dec(user.totpSecretEnc), input, user.totpLastStep);
  if (step !== null) {
    // Conditional update so the same code can't be used by two simultaneous requests.
    const r = await AdminUser.updateOne({ _id: user._id, totpLastStep: { $lt: step } }, { $set: { totpLastStep: step } });
    return r.modifiedCount === 1;
  }
  const h = hashBackup(input);
  if (user.backupCodes.includes(h)) {
    const r = await AdminUser.updateOne({ _id: user._id, backupCodes: h }, { $pull: { backupCodes: h } });
    return r.modifiedCount === 1;
  }
  return false;
}

/* ---------- sign-in step 2 ---------- */
export async function verifyTwoStepAction(code: string): Promise<{ ok: true; next: string } | Fail> {
  const parsed = codeSchema.safeParse(code);
  const pending = await getPendingLogin();
  if (!pending) return { ok: false, error: 'Your sign-in expired. Enter your email and password again.' };
  // Five tries per pending login, plus a per-account limit so a fresh pending login can't reset the count.
  const allowed = await rateLimit(`2fa:user:${pending.userId}`, 8, 15 * 60000);
  if (!allowed || pending.attempts >= 5) {
    await clearPendingLogin();
    return { ok: false, error: 'Too many attempts. Sign in again in a few minutes.' };
  }
  pending.attempts += 1;
  await pending.save();
  if (!parsed.success || !(await checkSecondFactor(String(pending.userId), parsed.data))) return { ok: false, error: "That code isn't right. Check it and try again." };

  await clearPendingLogin();
  await createSession(String(pending.userId), pending.remember);
  return { ok: true, next: pending.next };
}

/* ---------- Settings › Account: enrol, disable, backup codes ---------- */
async function requirePassword(userId: string, password: string): Promise<boolean> {
  await connectDB();
  const user = await AdminUser.findById(userId);
  return !!user && (await verifyPassword(user.passwordHash, password));
}

/** Step 1 of enrolment: confirm the password, create a pending secret and return the QR to scan. */
export async function beginTwoStepSetupAction(password: string): Promise<{ ok: true; qr: string; secret: string } | Fail> {
  const admin = await assertAdmin();
  if (!(await rateLimit(`2fa:setup:${admin.id}`, 10, 15 * 60000))) return { ok: false, error: 'Too many attempts. Try again in a few minutes.' };
  if (!(await requirePassword(admin.id, password))) return { ok: false, error: "That password isn't right." };
  const user = await AdminUser.findById(admin.id);
  if (!user) return { ok: false, error: 'Account not found.' };
  if (user.twoStepEnabled) return { ok: false, error: 'Two-step verification is already on.' };

  const totp = newTotp(user.email);
  user.totpPendingEnc = enc(totp.secret.base32);
  await user.save();
  return { ok: true, qr: await QRCode.toDataURL(totp.toString(), { margin: 1, width: 220 }), secret: totp.secret.base32 };
}

/** Step 2: the first valid code turns it on and returns the one-time backup codes. */
export async function confirmTwoStepSetupAction(code: string): Promise<{ ok: true; backupCodes: string[] } | Fail> {
  const admin = await assertAdmin();
  if (!(await rateLimit(`2fa:confirm:${admin.id}`, 10, 15 * 60000))) return { ok: false, error: 'Too many attempts. Try again in a few minutes.' };
  await connectDB();
  const user = await AdminUser.findById(admin.id);
  if (!user?.totpPendingEnc) return { ok: false, error: 'Start the setup again.' };
  const step = verifyTotp(dec(user.totpPendingEnc), code, 0);
  if (step === null) return { ok: false, error: "That code isn't right. Check the time on your phone and try again." };

  const { plain, hashes } = generateBackupCodes();
  user.totpSecretEnc = user.totpPendingEnc;
  user.totpPendingEnc = null;
  user.totpLastStep = step;
  user.twoStepEnabled = true;
  user.backupCodes = hashes;
  await user.save();
  revalidatePath('/admin', 'layout');
  return { ok: true, backupCodes: plain };
}

/** Turning it off needs both the password and a current code (or backup code). */
export async function disableTwoStepAction(password: string, code: string): Promise<{ ok: true } | Fail> {
  const admin = await assertAdmin();
  if (!(await rateLimit(`2fa:disable:${admin.id}`, 10, 15 * 60000))) return { ok: false, error: 'Too many attempts. Try again in a few minutes.' };
  if (!(await requirePassword(admin.id, password))) return { ok: false, error: "That password isn't right." };
  if (!(await checkSecondFactor(admin.id, code))) return { ok: false, error: "That code isn't right." };
  await AdminUser.updateOne({ _id: admin.id }, { $set: { twoStepEnabled: false, totpSecretEnc: null, totpPendingEnc: null, totpLastStep: 0, backupCodes: [] } });
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

export async function regenerateBackupCodesAction(password: string, code: string): Promise<{ ok: true; backupCodes: string[] } | Fail> {
  const admin = await assertAdmin();
  if (!(await rateLimit(`2fa:regen:${admin.id}`, 10, 15 * 60000))) return { ok: false, error: 'Too many attempts. Try again in a few minutes.' };
  if (!(await requirePassword(admin.id, password))) return { ok: false, error: "That password isn't right." };
  if (!(await checkSecondFactor(admin.id, code))) return { ok: false, error: "That code isn't right." };
  const { plain, hashes } = generateBackupCodes();
  await AdminUser.updateOne({ _id: admin.id }, { $set: { backupCodes: hashes } });
  return { ok: true, backupCodes: plain };
}

/** For the Settings card: how many backup codes are left. */
export async function twoStepStatusAction(): Promise<{ enabled: boolean; backupLeft: number }> {
  const admin = await assertAdmin();
  await connectDB();
  const u = await AdminUser.findById(admin.id).lean();
  return { enabled: !!u?.twoStepEnabled, backupLeft: u?.backupCodes?.length ?? 0 };
}
