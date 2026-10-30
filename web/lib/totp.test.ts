import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, generateBackupCodes, hashBackup, newTotp, normalizeBackup, verifyTotp } from './server/totp';

const KEY = '0f'.repeat(32);

describe('secret encryption', () => {
  it('round-trips and never stores the plain secret', () => {
    const enc = encryptSecret('JBSWY3DPEHPK3PXP', KEY);
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(enc, KEY)).toBe('JBSWY3DPEHPK3PXP');
  });
  it('uses a fresh IV each time', () => {
    expect(encryptSecret('x', KEY)).not.toBe(encryptSecret('x', KEY));
  });
  it('rejects a tampered payload and a wrong key', () => {
    const enc = encryptSecret('secret', KEY);
    const [iv, tag, data] = enc.split('.');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 1;
    expect(() => decryptSecret([iv, tag, flipped.toString('base64')].join('.'), KEY)).toThrow();
    expect(() => decryptSecret(enc, 'ab'.repeat(32))).toThrow();
  });
  it('requires a 32-byte key', () => {
    expect(() => encryptSecret('x', 'short')).toThrow(/64 hex/);
  });
});

describe('TOTP verification', () => {
  const secret = newTotp('me').secret.base32;
  const now = Date.UTC(2026, 9, 30, 12, 0, 0);
  const codeAt = (t: number) => newTotp('me', secret).generate({ timestamp: t });

  it('accepts the current code and one step of drift', () => {
    expect(verifyTotp(secret, codeAt(now), 0, now)).not.toBeNull();
    expect(verifyTotp(secret, codeAt(now - 30000), 0, now)).not.toBeNull();
    expect(verifyTotp(secret, codeAt(now + 30000), 0, now)).not.toBeNull();
  });
  it('rejects old, wrong or malformed codes', () => {
    expect(verifyTotp(secret, codeAt(now - 120000), 0, now)).toBeNull();
    expect(verifyTotp(secret, '000000', 0, now)).toBeNull();
    expect(verifyTotp(secret, 'abcdef', 0, now)).toBeNull();
    expect(verifyTotp(secret, '12345', 0, now)).toBeNull();
  });
  it('refuses to accept the same code twice (replay)', () => {
    const step = verifyTotp(secret, codeAt(now), 0, now)!;
    expect(verifyTotp(secret, codeAt(now), step, now)).toBeNull();
  });
  it('tolerates spaces in the entered code', () => {
    const c = codeAt(now);
    expect(verifyTotp(secret, `${c.slice(0, 3)} ${c.slice(3)}`, 0, now)).not.toBeNull();
  });
});

describe('backup codes', () => {
  it('generates 8 distinct codes and stores only hashes', () => {
    const { plain, hashes } = generateBackupCodes();
    expect(plain).toHaveLength(8);
    expect(new Set(plain).size).toBe(8);
    expect(plain[0]).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/);
    expect(hashes).toEqual(plain.map(hashBackup));
    expect(hashes.join('')).not.toContain(plain[0]);
  });
  it('matches regardless of case, dashes and spaces', () => {
    expect(hashBackup('ABCDE-FGHJK')).toBe(hashBackup('abcde fghjk'));
    expect(normalizeBackup(' AbC-de ')).toBe('abcde');
  });
});
