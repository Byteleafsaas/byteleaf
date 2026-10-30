import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'node:crypto';
import * as OTPAuth from 'otpauth';

// Two-step verification (RFC 6238 TOTP, SHA-1, 6 digits, 30 s: compatible with every authenticator app).
// Pure helpers with no Next.js dependency, so they are unit-testable and usable from scripts.

const PERIOD = 30;

/** Secrets are encrypted at rest with AES-256-GCM. `keyHex` is 64 hex chars (32 bytes). */
export function encryptSecret(plain: string, keyHex: string): string {
  const key = parseKey(keyHex);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}

export function decryptSecret(payload: string, keyHex: string): string {
  const [iv, tag, enc] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
  const d = createDecipheriv('aes-256-gcm', parseKey(keyHex), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

function parseKey(hex: string) {
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('TOTP_ENCRYPTION_KEY must be 64 hex characters (32 bytes).');
  return Buffer.from(hex, 'hex');
}

export function newTotp(label: string, secretBase32?: string) {
  return new OTPAuth.TOTP({
    issuer: 'byteleaf',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: PERIOD,
    secret: secretBase32 ? OTPAuth.Secret.fromBase32(secretBase32) : new OTPAuth.Secret({ size: 20 }),
  });
}

/**
 * Checks a 6-digit code, allowing one step of clock drift either side. Returns the time step that matched so the
 * caller can refuse to accept the same code twice (replay protection), or null if the code is wrong.
 */
export function verifyTotp(secretBase32: string, code: string, lastStep = 0, now = Date.now()): number | null {
  const token = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return null;
  const delta = newTotp('check', secretBase32).validate({ token, timestamp: now, window: 1 });
  if (delta === null) return null;
  const step = Math.floor(now / 1000 / PERIOD) + delta;
  return step > lastStep ? step : null;
}

/* ---------- backup codes ---------- */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (0/o, 1/l/i)
export const hashBackup = (code: string) => createHash('sha256').update(normalizeBackup(code)).digest('hex');
export const normalizeBackup = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, '');

/** 8 single-use codes shown once ("abcde-fghjk"); only their hashes are stored. */
export function generateBackupCodes(n = 8): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: n }, () => {
    const s = Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
  return { plain, hashes: plain.map(hashBackup) };
}
