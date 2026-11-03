import 'server-only';
import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import { isPrivateIp, normaliseUrl } from '@/lib/assistant/net';

/** A problem the owner can understand and fix, written in plain words. */
export class SourceProblem extends Error {}

const MAX_BYTES = 1_500_000;
const MAX_HOPS = 4;

async function assertPublic(u: URL) {
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = isIP(host) ? [host] : (await dns.lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (!addrs.length) throw new SourceProblem("We couldn't find that website. Check the address is spelled right.");
  if (addrs.some(isPrivateIp)) throw new SourceProblem("That address isn't a public website, so it can't be read.");
}

export function parseWebAddress(raw: string): URL {
  const u = normaliseUrl(raw);
  if (!u) throw new SourceProblem('Enter a web address like khumalosolar.example/services.');
  return u;
}

/** Fetches one page as text. Checks every address it visits, follows a few redirects and caps the size. */
export async function fetchHtml(start: URL): Promise<{ url: URL; html: string }> {
  let url = start;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    await assertPublic(url);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);
    let res: Response;
    try {
      res = await fetch(url, { redirect: 'manual', signal: ctl.signal, headers: { 'user-agent': 'byteleaf-assistant/1.0 (+reads public pages for the site owner)', accept: 'text/html,application/xhtml+xml' } });
    } catch (e) {
      if (e instanceof SourceProblem) throw e;
      throw new SourceProblem("We couldn't reach that address. Check it's right and the site is online.");
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url);
      if (!/^https?:$/.test(url.protocol)) throw new SourceProblem('That page redirects somewhere we cannot read.');
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new SourceProblem('That page needs a login, so it can’t be read. Add the information as text instead.');
    if (res.status === 404) throw new SourceProblem('That page doesn’t exist (404). Check the address.');
    if (!res.ok) throw new SourceProblem(`That site answered with an error (${res.status}). Try again later.`);
    const type = res.headers.get('content-type') ?? '';
    if (type && !/text\/html|application\/xhtml/i.test(type)) throw new SourceProblem('That address isn’t a web page. If it’s a file, upload it instead.');

    const reader = res.body?.getReader();
    if (!reader) throw new SourceProblem('That page was empty.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); break; }
      chunks.push(value);
    }
    return { url, html: Buffer.concat(chunks).toString('utf8') };
  }
  throw new SourceProblem('That page redirects too many times.');
}
