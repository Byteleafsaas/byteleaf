import { describe, expect, it } from 'vitest';
import { MESSAGES, canEmail, enquiryProblems, firstName, visitorPhoneOk } from './enquiry';

describe('the booking request form', () => {
  it('needs a name and a phone number, and says which is missing', () => {
    expect(enquiryProblems({ name: 'Lindiwe', phone: '082 123 4567' })).toEqual({});
    expect(enquiryProblems({ name: '', phone: '082 123 4567' })).toEqual({ name: MESSAGES.missingName });
    expect(enquiryProblems({ name: 'Lindiwe', phone: '' })).toEqual({ phone: MESSAGES.missingPhone });
    expect(enquiryProblems({ name: '  ', phone: ' ' })).toEqual({ name: MESSAGES.missingName, phone: MESSAGES.missingPhone });
  });

  it('tells the visitor a short number looks short, in the handoff\'s words', () => {
    expect(enquiryProblems({ name: 'A', phone: '082 123 456' }).phone).toBe('That number looks short. Use 10 digits, like 082 123 4567.');
    expect(enquiryProblems({ name: 'A', phone: 'call me' }).phone).toBe(MESSAGES.badPhone);
  });

  it.each(['082 123 4567', '0821234567', '+27 82 123 4567', '(012) 345-6789'])('accepts %s', (v) => expect(visitorPhoneOk(v)).toBe(true));

  it('takes the first name for the thank-you', () => {
    expect(firstName('Lindiwe Dube')).toBe('Lindiwe');
    expect(firstName('  Thandi ')).toBe('Thandi');
    expect(firstName('')).toBe('');
  });

  it('only emails an address that is real, not a [placeholder]', () => {
    expect(canEmail('hello@tsela.co.za')).toBe(true);
    expect(canEmail('[email address]')).toBe(false);
    expect(canEmail('hello@tsela')).toBe(false);
  });
});
