// Models are asked for one JSON object but sometimes wrap it in a code fence or add a sentence around it.
// This pulls the object out so a slightly messy reply still works. Pure, so it is easy to test.

/** The first complete top-level JSON object in a model's reply, parsed. Throws if there isn't one. */
export function extractJson(raw: string): unknown {
  const text = raw.replace(/```(?:json)?/gi, '');
  const start = text.indexOf('{');
  if (start === -1) throw new Error('no JSON object in the reply');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error('the JSON object in the reply is incomplete');
}
