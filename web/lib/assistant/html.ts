// Reads the text and links out of an HTML page without a DOM library. Good enough for ordinary business sites.

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', times: '×' };

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

const BLOCK = /<\/?(p|div|section|article|main|header|li|ul|ol|table|tr|h[1-6]|br|blockquote|dt|dd|figcaption)\b[^>]*>/gi;

export function htmlToText(html: string): string {
  return decode(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|nav|footer|form|iframe|template)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<h([1-6])\b[^>]*>/gi, '\n\n<h$1>')
      .replace(BLOCK, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function pageTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decode(m[1]).replace(/\s+/g, ' ').trim() : '';
}

/** Links to other pages on the same site, without fragments, query strings or files that aren't pages. */
export function sameSiteLinks(html: string, base: URL): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)[^"']*["']/gi)) {
    try {
      const u = new URL(decode(m[1]), base);
      if (u.origin !== base.origin || !/^https?:$/.test(u.protocol)) continue;
      if (/\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4|mp3|css|js|ico)$/i.test(u.pathname)) continue;
      u.hash = '';
      u.search = '';
      const href = u.toString().replace(/\/$/, '');
      if (href !== base.toString().replace(/\/$/, '')) out.add(href);
    } catch {
      // not a usable link
    }
  }
  return [...out];
}
