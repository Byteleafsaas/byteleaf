// How an edit from the browser is applied to a page. The owner can change what is inside the fixed blocks, never the
// blocks themselves: a request can't add, remove, reorder or retype a block, or change a limit. Pure, so it can be tested.
import { blockProblem } from './rules';
import type { Block, ButtonTarget } from './types';

const TARGETS: ButtonTarget[] = ['contact', 'whatsapp', 'call'];

export type Incoming = { id: string; value?: string; on?: boolean; target?: string };
export type PageEdit = { ok: true; blocks: Block[] } | { ok: false; error: string };

export function applyPageEdit(current: Block[], incoming: unknown, photoIds: string[]): PageEdit {
  if (!Array.isArray(incoming)) return { ok: false, error: 'That edit could not be read.' };
  const by = new Map<string, Incoming>();
  for (const x of incoming) if (x && typeof x === 'object' && typeof (x as Incoming).id === 'string') by.set((x as Incoming).id, x as Incoming);
  const out: Block[] = [];
  for (const b of current) {
    const i = by.get(b.id);
    let next: Block = b;
    if (i) {
      if ((b.type === 'heading' || b.type === 'text') && typeof i.value === 'string') next = { ...b, value: i.value };
      else if (b.type === 'button') next = { ...b, value: typeof i.value === 'string' ? i.value : b.value, target: TARGETS.includes(i.target as ButtonTarget) ? (i.target as ButtonTarget) : b.target };
      else if (b.type === 'image' && typeof i.value === 'string') {
        if (i.value !== '' && !photoIds.includes(i.value)) return { ok: false, error: 'That photo no longer exists.' };
        next = { ...b, value: i.value };
      } else if (b.type === 'section' && typeof i.on === 'boolean') next = { ...b, on: i.on };
    }
    const problem = blockProblem(next);
    if (problem) return { ok: false, error: `${next.label}: ${problem}` };
    out.push(next);
  }
  return { ok: true, blocks: out };
}
