// Pure password/token helpers with no Next.js dependencies, so CLI scripts can use them too.
import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

// argon2id (the default algorithm of @node-rs/argon2).
export const hashPassword = (pw: string) => hash(pw, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (hashed: string, pw: string) => verify(hashed, pw).catch(() => false);

/** HANDOFF-ADMIN §3: ≥12 chars, upper + lower case, a number and a symbol. Enforced here as well as on the form. */
export function passwordProblems(pw: string): string[] {
  const p: string[] = [];
  if (pw.length < 12) p.push('at least 12 characters');
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) p.push('upper and lower case letters');
  if (!/\d/.test(pw)) p.push('a number');
  if (!/[^A-Za-z0-9]/.test(pw)) p.push('a symbol');
  return p;
}

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
