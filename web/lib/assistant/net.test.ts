import { describe, expect, it } from 'vitest';
import { isPrivateIp, normaliseUrl } from './net';

describe('isPrivateIp', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.18.135', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', '::7f00:1', '64:ff9b::7f00:1', '2002:7f00:1::', '224.0.0.1', 'garbage'])('%s is private', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });
  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '41.0.0.1', '2606:4700:4700::1111', '::ffff:808:808', '64:ff9b::808:808'])('%s is public', (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
  it.each(['http://[::ffff:127.0.0.1]/', 'http://[::ffff:169.254.169.254]/', 'http://[::127.0.0.1]/', 'http://2130706433/'])('%s is private once the URL parser has rewritten it', (u) => {
    expect(isPrivateIp(new URL(u).hostname.replace(/^\[|\]$/g, ''))).toBe(true);
  });
});

describe('normaliseUrl', () => {
  it('adds https to a bare address', () => {
    expect(normaliseUrl('khumalosolar.example/services')?.toString()).toBe('https://khumalosolar.example/services');
  });
  it('keeps http and https addresses', () => {
    expect(normaliseUrl('http://example.com')?.protocol).toBe('http:');
  });
  it.each(['', 'not a url', 'ftp://example.com', 'javascript:alert(1)', 'https://user:pass@example.com', 'file:///etc/passwd', 'intranet'])('rejects %s', (v) => {
    expect(normaliseUrl(v)).toBeNull();
  });
});
