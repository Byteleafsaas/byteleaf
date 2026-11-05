import { describe, expect, it } from 'vitest';
import { defaultSettings, defaultPages } from './defaults';
import { blockProblem, counterState, emailProblem, logoWord, phoneProblem, rands, serviceProblems, settingsProblems, waDigits } from './rules';

describe('phone numbers', () => {
  it.each(['082 123 4567', '0821234567', '+27 82 123 4567', '(012) 345-6789', '+27821234567'])('accepts %s', (v) => expect(phoneProblem(v)).toBeNull());
  it.each(['', '12345', '082 123 456', '0821234567890', 'call me'])('rejects %j', (v) => expect(phoneProblem(v)).not.toBeNull());
  it('accepts a [placeholder] and, when optional, an empty value', () => {
    expect(phoneProblem('[phone number]')).toBeNull();
    expect(phoneProblem('', false)).toBeNull();
  });
});

describe('email', () => {
  it('accepts a full address and a placeholder, rejects the rest', () => {
    expect(emailProblem('hello@tsela.co.za')).toBeNull();
    expect(emailProblem('[email address]')).toBeNull();
    expect(emailProblem('hello@tsela')).not.toBeNull();
    expect(emailProblem('')).not.toBeNull();
  });
});

describe('page blocks', () => {
  const home = defaultPages().home;
  const heading = home[0];
  it('needs a heading and a button label, and enforces the limits', () => {
    if (heading.type !== 'heading') throw new Error('x');
    expect(blockProblem(heading)).toBeNull();
    expect(blockProblem({ ...heading, value: '  ' })).toBe('Add a heading.');
    expect(blockProblem({ ...heading, value: 'x'.repeat(61) })).toBe('Use 60 characters or fewer (now 61).');
    const button = home[2];
    if (button.type !== 'button') throw new Error('x');
    expect(blockProblem({ ...button, value: '' })).toBe('Give the button a label.');
    expect(blockProblem({ ...button, value: 'x'.repeat(25) })).toContain('24');
  });
  it('shows amber from 85% of the limit and red past it', () => {
    expect(counterState(50, 60)).toBe('ok');
    expect(counterState(51, 60)).toBe('near');
    expect(counterState(60, 60)).toBe('near');
    expect(counterState(61, 60)).toBe('over');
  });
});

describe('services', () => {
  const ok = { name: 'Express wash', price: 120, time: '45 minutes', included: [] as string[] };
  it('needs a name, a price (or "no fixed price") and a time', () => {
    expect(serviceProblems(ok)).toEqual({});
    expect(serviceProblems({ ...ok, name: '' }).name).toBeDefined();
    expect(serviceProblems({ ...ok, name: 'x'.repeat(41) }).name).toBeDefined();
    expect(serviceProblems({ ...ok, price: null })).toEqual({}); // ask for a price
    expect(serviceProblems({ ...ok, price: undefined }).price).toBeDefined();
    expect(serviceProblems({ ...ok, price: -5 }).price).toBeDefined();
    expect(serviceProblems({ ...ok, time: '' }).time).toBeDefined();
  });
  it('writes prices in rands, or asks for a price', () => {
    expect(rands(250)).toBe('R 250');
    expect(rands(1250)).toBe('R 1 250');
    expect(rands(null)).toBe('Ask for a price');
  });
});

describe('site settings', () => {
  it('accepts the starting settings, placeholders included', () => {
    expect(settingsProblems(defaultSettings())).toEqual({});
  });
  it('reports each problem on its own field', () => {
    const e = settingsProblems({ ...defaultSettings(), name: '', phone: '123', email: 'x', instagram: 'tsela', facebook: 'nope', whatsappSame: false, whatsapp: '' });
    expect(Object.keys(e).sort()).toEqual(['email', 'facebook', 'instagram', 'name', 'phone', 'whatsapp']);
  });
  it('limits areas', () => {
    expect(settingsProblems({ ...defaultSettings(), areas: Array.from({ length: 11 }, (_, i) => `Area ${i}`) }).areas).toBeDefined();
    expect(settingsProblems({ ...defaultSettings(), areas: ['x'.repeat(29)] }).areas).toBeDefined();
  });
});

describe('derived details', () => {
  it('takes the logo word from the first word of the name', () => {
    expect(logoWord('Tsela Mobile Wash')).toBe('tsela');
    expect(logoWord('  Bright Spark Electrical')).toBe('bright');
    expect(logoWord('')).toBe('your');
  });
  it('builds the WhatsApp number from the phone unless a separate one is set', () => {
    const s = defaultSettings();
    expect(waDigits({ ...s, phone: '082 123 4567' })).toBe('27821234567');
    expect(waDigits({ ...s, phone: '+27 82 123 4567' })).toBe('27821234567');
    expect(waDigits({ ...s, phone: '082 111 1111', whatsappSame: false, whatsapp: '083 222 2222' })).toBe('27832222222');
    expect(waDigits(s)).toBe(''); // still a [placeholder]
  });
});
