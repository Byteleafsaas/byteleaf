import { describe, expect, it } from 'vitest';
import { amounts, conflicts } from './conflict';

describe('amounts', () => {
  it('reads rand amounts in common formats', () => {
    expect(amounts('R 112 000 installed, or R118,500 on the website, plus R39 900.50')).toEqual([112000, 118500, 39900]);
  });
  it('ignores small numbers and years', () => {
    expect(amounts('a 25-year warranty from 2026 and 10 kWh, R 50')).toEqual([]);
  });
});

describe('conflicts', () => {
  const web = { title: 'Family package price', text: 'Family package: 5 kW of panels and a 10 kWh battery. From R 118 500 installed.' };
  const pdf = { title: 'Family package price', text: 'Family package: 5 kW of panels and a 10 kWh battery. R 112 000 installed.' };
  const essential = { title: 'Essential package price', text: 'Essential package: 3 kW of panels and a 5 kWh battery. R 68 500 installed.' };

  it('flags the same package with two different prices', () => {
    expect(conflicts(pdf, web)).toBe(true);
  });
  it('does not flag different packages', () => {
    expect(conflicts(essential, web)).toBe(false);
  });
  it('does not flag the same price stated twice', () => {
    expect(conflicts(web, { ...web, title: 'Family package from the website' })).toBe(false);
  });
  it('does not flag items without amounts', () => {
    expect(conflicts({ title: 'Warranty', text: 'Panels carry a 25 year warranty.' }, web)).toBe(false);
  });
});
