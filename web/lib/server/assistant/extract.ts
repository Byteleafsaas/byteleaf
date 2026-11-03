import 'server-only';
import { SourceProblem } from './safe-fetch';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type Extracted = { text: string; pages: number; kind: 'PDF' | 'Word document' | 'Text' };

const kindOf = (name: string, mime: string): Extracted['kind'] | null => {
  const n = name.toLowerCase();
  if (n.endsWith('.pdf') || mime === 'application/pdf') return 'PDF';
  if (n.endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word document';
  if (/\.(txt|md|csv)$/.test(n) || mime.startsWith('text/')) return 'Text';
  return null;
};

/** Reads the text out of an uploaded file. Throws a SourceProblem written for the owner when it can't. */
export async function extractFile(buf: Buffer, name: string, mime: string): Promise<Extracted> {
  const kind = kindOf(name, mime);
  if (!kind) throw new SourceProblem('That file type isn’t supported. Upload a PDF, Word (.docx) or text file.');
  if (buf.byteLength > MAX_FILE_BYTES) throw new SourceProblem('That file is over 10 MB. Split it up or paste the text instead.');

  try {
    if (kind === 'PDF') {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { totalPages, text } = await extractText(pdf, { mergePages: true });
      if (text.trim().length < 40) throw new SourceProblem('Couldn’t read this file. It is a scanned image with no text in it. Upload a text PDF, or open it and paste the text instead.');
      return { text, pages: totalPages, kind };
    }
    if (kind === 'Word document') {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer: buf });
      if (value.trim().length < 40) throw new SourceProblem('Couldn’t find any text in this document. Open it and paste the text instead.');
      return { text: value, pages: Math.max(1, Math.round(value.length / 3000)), kind };
    }
    const text = buf.toString('utf8');
    if (text.trim().length < 20) throw new SourceProblem('That file has no text in it.');
    return { text, pages: 1, kind };
  } catch (e) {
    if (e instanceof SourceProblem) throw e;
    console.error('[assistant] could not read file:', (e as Error).message);
    throw new SourceProblem('Couldn’t read this file. It may be damaged or password protected. Try another copy, or paste the text instead.');
  }
}
