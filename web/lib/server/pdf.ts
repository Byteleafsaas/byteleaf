import 'server-only';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { cookies, headers } from 'next/headers';
import { SESSION_COOKIE } from './auth';

// Renders /admin/billing/[id]/print in headless Chromium so the PDF matches the design pixel for pixel (HANDOFF-ADMIN §9).
// Chromium: set CHROME_PATH, or have Google Chrome / Edge installed. In Docker use the Playwright image or install chromium.

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function chromePath() {
  return process.env.CHROME_PATH || CANDIDATES.find((p) => existsSync(p));
}

// Small cache keyed by document id + version so repeat downloads don't re-render.
const cache = new Map<string, Buffer>();

export async function renderDocumentPdf(id: string, version: string): Promise<Buffer> {
  const key = `${id}:${version}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const executablePath = chromePath();
  if (!executablePath) throw new Error('No Chromium/Chrome found for PDF generation. Set CHROME_PATH.');

  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  const origin = `${proto}://${host}`;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new Error('UNAUTHORIZED');

  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext();
    await ctx.addCookies([{ name: SESSION_COOKIE, value: token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
    const page = await ctx.newPage();
    const res = await page.goto(`${origin}/admin/billing/${id}/print`, { waitUntil: 'networkidle' });
    if (!res?.ok()) throw new Error(`Print view returned ${res?.status()}`);
    await page.evaluate(() => document.fonts.ready);
    const pdf = Buffer.from(await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } }));
    if (cache.size > 50) cache.delete(cache.keys().next().value!);
    cache.set(key, pdf);
    return pdf;
  } finally {
    await browser.close();
  }
}
