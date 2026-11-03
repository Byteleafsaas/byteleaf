import { describe, expect, it } from 'vitest';
import { htmlToText, pageTitle, sameSiteLinks } from './html';
import { splitIntoItems } from './split';

describe('splitIntoItems', () => {
  it('turns headings and paragraphs into titled items', () => {
    const items = splitIntoItems('Warranty\nPanels carry a 25-year warranty and inverters 10 years.\n\nFinance\nPay over 12 to 60 months through our finance partner.');
    expect(items.map((i) => i.title)).toEqual(['Warranty', 'Finance']);
    expect(items[0].text).toContain('25-year');
  });

  it('makes a title from the first words when there is no heading', () => {
    const [item] = splitIntoItems('We install panels, inverters and batteries across Gauteng every week of the year.');
    expect(item.title.startsWith('We install panels')).toBe(true);
  });

  it('drops repeats and fragments that cannot answer anything', () => {
    const items = splitIntoItems('Home\n\nHome\n\nFree site assessment for every customer in Gauteng.\n\nFree site assessment for every customer in Gauteng.');
    expect(items).toHaveLength(1);
  });

  it('breaks very long paragraphs on sentence boundaries', () => {
    const long = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} says something useful about the service.`).join(' ');
    const items = splitIntoItems(long);
    expect(items.length).toBeGreaterThan(1);
    expect(items.every((i) => i.text.length <= 640)).toBe(true);
  });
});

describe('html helpers', () => {
  const html = `<html><head><title>Services &amp; packages</title><style>.x{}</style></head><body><nav><a href="/">Home</a></nav>
    <h1>Our packages</h1><p>Essential: R&nbsp;68&nbsp;500 installed.</p><script>alert(1)</script><footer>Copyright</footer>
    <a href="/finance#top">Finance</a><a href="https://other.example/x">Other</a><a href="/brochure.pdf">PDF</a><a href="/about?x=1">About</a></body></html>`;

  it('reads visible text and drops scripts, styles, nav and footer', () => {
    const t = htmlToText(html);
    expect(t).toContain('Our packages');
    expect(t).toContain('Essential: R 68 500 installed.');
    expect(t).not.toMatch(/alert|Copyright|\.x\{/);
  });

  it('reads the title with entities decoded', () => {
    expect(pageTitle(html)).toBe('Services & packages');
  });

  it('finds links on the same site only, without files or fragments', () => {
    expect(sameSiteLinks(html, new URL('https://khumalosolar.example/services'))).toEqual(['https://khumalosolar.example', 'https://khumalosolar.example/finance', 'https://khumalosolar.example/about']);
  });
});
