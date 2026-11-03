// Turns raw text into short, self-contained knowledge items. Used when no AI model is configured, and to
// pre-split very long text before it goes to the model. Pure, so it is easy to test.

export type RawItem = { title: string; text: string; unsure?: string; unsurePhrase?: string; asks?: string };

const MAX_ITEM = 600;
const MAX_ITEMS = 120;

const clean = (s: string) => s.replace(/[ \t]+/g, ' ').replace(/[ ]{2,}/g, ' ').trim();

/** A short line with no sentence punctuation reads as a heading. */
const isHeading = (line: string) => line.length >= 3 && line.length <= 70 && !/[.!?:;,]$/.test(line) && line.split(/\s+/).length <= 9;

function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}

function titleFrom(text: string): string {
  const first = sentences(text)[0] ?? text;
  const words = first.replace(/[.!?:]+$/, '').split(/\s+/);
  const t = words.slice(0, 8).join(' ');
  return t.length < first.length ? `${t}…` : t;
}

/** Breaks one long paragraph into pieces under the item size limit, on sentence boundaries. */
function chunk(text: string): string[] {
  if (text.length <= MAX_ITEM) return [text];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences(text)) {
    if (cur && (cur + ' ' + s).length > MAX_ITEM) { out.push(cur); cur = s; }
    else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

export function splitIntoItems(raw: string): RawItem[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n').map(clean);
  const blocks: { heading: string; body: string[] }[] = [];
  let heading = '';
  let body: string[] = [];
  const flush = () => { if (body.length) blocks.push({ heading, body }); body = []; };

  for (const line of lines) {
    if (!line) { flush(); continue; }
    if (isHeading(line) && !body.length) { heading = line; continue; }
    // A heading in the middle of a block starts a new block.
    if (isHeading(line) && body.length && /^[A-Z0-9]/.test(line)) { flush(); heading = line; continue; }
    body.push(line);
  }
  flush();

  const items: RawItem[] = [];
  const seen = new Set<string>();
  for (const b of blocks) {
    for (const piece of chunk(b.body.join(' '))) {
      const text = clean(piece);
      const key = text.toLowerCase();
      if (text.length < 20 || seen.has(key)) continue; // too short to answer anything, or a repeat
      seen.add(key);
      items.push({ title: b.heading || titleFrom(text), text });
      if (items.length >= MAX_ITEMS) return items;
    }
  }
  return items;
}
