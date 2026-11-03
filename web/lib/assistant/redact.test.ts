import { describe, expect, it } from 'vitest';
import { hasContactDetails, redact } from './redact';

describe('redact', () => {
  it('removes phone numbers in common South African formats', () => {
    expect(redact('call me on 082 555 0123')).toBe('call me on [phone removed]');
    expect(redact('my number is +27 82 555 0123 thanks')).toBe('my number is [phone removed] thanks');
    expect(redact('0825550123')).toBe('[phone removed]');
    expect(redact('(011) 555-0123')).toBe('[phone removed]');
  });

  it('removes email addresses', () => {
    expect(redact('write to lindiwe.m@example.co.za please')).toBe('write to [email removed] please');
  });

  it('removes 13 digit ID numbers and long card-like numbers', () => {
    expect(redact('my id is 9001015800085')).toBe('my id is [ID removed]');
    expect(redact('card 4111 1111 1111 1111 1')).toContain('[number removed]');
  });

  it('keeps prices, sizes and years', () => {
    for (const s of ['The Essential package is R 68 500 installed', 'Family 5 kW / 10 kWh for R 112 000', 'a 25-year warranty from 2026', 'about 12 to 60 months']) {
      expect(redact(s)).toBe(s);
    }
  });

  it('handles several details in one message', () => {
    expect(redact('email a@b.co or call 082 555 0123')).toBe('email [email removed] or call [phone removed]');
  });

  it('tells whether a message has contact details', () => {
    expect(hasContactDetails('call 082 555 0123')).toBe(true);
    expect(hasContactDetails('How much is R 112 000 over 60 months?')).toBe(false);
  });
});
