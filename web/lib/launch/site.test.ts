import { describe, expect, it } from 'vitest';
import { defaultSnapshot } from './defaults';
import { areaSpan, closedLine, fromPrice, galleryPhotos, homePhoto, hoursLine, sectionOn, telHref, waLink, wantsPhotos } from './site';
import { removePhoto } from './ops';

describe('contact details', () => {
  it('makes a tel link only from a real South African number', () => {
    expect(telHref('082 123 4567')).toBe('tel:+27821234567');
    expect(telHref('+27 82 123 4567')).toBe('tel:+27821234567');
    expect(telHref('[phone number]')).toBeNull();
    expect(telHref('12345')).toBeNull();
  });
  it('links to WhatsApp when there is a number, and to the Contact page while there is only a placeholder', () => {
    const s = defaultSnapshot().settings;
    expect(waLink(s)).toBe('/projects/launch-website/sample/contact');
    expect(waLink({ ...s, phone: '082 123 4567' })).toMatch(/^https:\/\/wa\.me\/27821234567\?text=/);
    expect(waLink({ ...s, whatsappSame: false, whatsapp: '083 222 2222', phone: '082 123 4567' })).toContain('27832222222');
  });
});

describe('opening hours in words', () => {
  it('joins weekdays and Saturday when they match, and separates them when they do not', () => {
    expect(hoursLine({ weekdays: '07:00–17:00', saturday: '07:00–17:00', sunday: 'Closed' })).toBe('Mon–Sat, 07:00–17:00');
    expect(hoursLine({ weekdays: '07:00–17:00', saturday: '08:00–13:00', sunday: 'Closed' })).toBe('Mon–Fri, 07:00–17:00 · Sat, 08:00–13:00');
    expect(hoursLine({ weekdays: '07:00–17:00', saturday: 'Closed', sunday: 'Closed' })).toBe('Mon–Fri, 07:00–17:00');
    expect(closedLine({ weekdays: '', saturday: '', sunday: 'Closed' })).toBe('Closed Sundays and public holidays');
    expect(closedLine({ weekdays: '', saturday: '', sunday: '09:00–12:00' })).toBe('Sun, 09:00–12:00');
  });
});

describe('prices and areas', () => {
  it('shows the lowest fixed price of the services that are on the site', () => {
    const s = defaultSnapshot();
    expect(fromPrice(s.services)).toBe('R 120');
    expect(fromPrice(s.services.map((x, i) => (i === 0 ? { ...x, visible: false } : x)))).toBe('R 250');
    expect(fromPrice(s.services.map((x) => ({ ...x, price: null })))).toBeNull();
  });
  it('describes the span of areas', () => {
    expect(areaSpan(['Centurion', 'Hatfield', 'Brooklyn', 'Menlyn', 'Waterkloof'])).toBe('Centurion to Menlyn');
    expect(areaSpan(['Centurion', 'Hatfield'])).toBe('Centurion to Hatfield');
    expect(areaSpan(['Centurion'])).toBe('Centurion');
  });
});

describe('photos and sections', () => {
  it('uses the Home photo when there is one and falls back to none when it is removed', () => {
    const s = defaultSnapshot();
    expect(homePhoto(s)?.id).toBe('p1');
    expect(homePhoto(removePhoto(s, 'p1')!)).toBeNull();
    expect(galleryPhotos(s)).toHaveLength(6);
  });
  it('shows a section unless the owner switched it off', () => {
    const s = defaultSnapshot();
    expect(sectionOn(s, 'home', 'h8')).toBe(true);
    s.pages.home = s.pages.home.map((b) => (b.id === 'h8' && b.type === 'section' ? { ...b, on: false } : b));
    expect(sectionOn(s, 'home', 'h8')).toBe(false);
  });
  it('can always be shown without photos', () => {
    expect(wantsPhotos(undefined)).toBe(true);
    expect(wantsPhotos('false')).toBe(false);
  });
});
