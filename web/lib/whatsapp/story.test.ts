import { describe, expect, it } from 'vitest';
import { FLOWS, asOut, init, script, settle, tap, type FlowKey, type Story } from './story';
import { validateOut } from './types';

/** Taps through a whole story the way a visitor would, always choosing the highlighted option. */
function play(flow: FlowKey): Story {
  let s = init(flow);
  for (let i = 0; i < 20; i++) {
    const cur = script(flow)[s.step];
    if (!cur?.expect) break;
    const r = tap(s, cur.expect);
    if (r.kind !== 'go') throw new Error(`stuck at step ${s.step}`);
    s = settle(r.story, r.next);
  }
  return s;
}

describe('the guided demo stories', () => {
  it.each(FLOWS.map((f) => [f.key]))('%s: tapping the highlighted option every time reaches the end', (flow) => {
    const s = play(flow as FlowKey);
    expect(script(flow as FlowKey)[s.step].expect).toBeNull();
  });

  it('only advances on the expected option; anything else shows the hint and changes nothing', () => {
    const s = init('book');
    expect(tap(s, "Kids' braids")).toEqual({ kind: 'hint' });
    expect(tap(s, 'Other services')).toEqual({ kind: 'hint' });
    expect(tap(s, 'Knotless braids').kind).toBe('go');
  });

  it('book: the time is held while the client confirms, then becomes a booking and notifies the owner', () => {
    let s = init('book');
    const steps = ['Knotless braids', 'Sat 7 Nov', '08:00'];
    for (const l of steps) { const r = tap(s, l); if (r.kind !== 'go') throw new Error(l); s = settle(r.story, r.next); }
    expect(s.owner).toMatchObject({ held: true, booked: false });
    const r = tap(s, 'Confirm');
    if (r.kind !== 'go') throw new Error('confirm');
    s = settle(r.story, r.next);
    expect(s.owner).toMatchObject({ held: false, booked: true });
    expect(s.owner.ntf).toContain('New booking on WhatsApp');
  });

  it('move: the old time is freed and the owner is told', () => {
    const s = play('move');
    expect(s.owner.moved).toBe(true);
    expect(s.owner.ntf).toContain('Sat 7 Nov 08:00 → Tue 10 Nov 10:30');
  });

  it('person: the chat is flagged, the owner takes over, sends, and hands back; the owner steps add no client bubble', () => {
    let s = init('person');
    const r1 = tap(s, 'Ask a person'); if (r1.kind !== 'go') throw new Error('1'); s = settle(r1.story, r1.next);
    expect(s.owner.flag).toBe(true);
    const before = s.msgs.filter((m) => m.me).length;
    const r2 = tap(s, 'owner:take'); if (r2.kind !== 'go') throw new Error('2'); s = settle(r2.story, r2.next);
    expect(s.msgs.filter((m) => m.me).length).toBe(before);
    expect(s.owner.taken).toBe(true);
    const r3 = tap(s, 'owner:send'); if (r3.kind !== 'go') throw new Error('3'); s = settle(r3.story, r3.next);
    const r4 = tap(s, 'owner:back'); if (r4.kind !== 'go') throw new Error('4'); s = settle(r4.story, r4.next);
    expect(s.owner.back).toBe(true);
    expect(s.msgs.some((m) => m.staff)).toBe(true);
  });

  it('every message in every story fits WhatsApp: body, buttons, list rows and footer', () => {
    for (const f of FLOWS) for (const step of script(f.key)) {
      const out = asOut({ ...step.bot, time: '09:00' });
      expect(out).not.toBeNull();
      expect(validateOut(out!), `${f.key}: ${step.bot.text.slice(0, 40)}`).toEqual([]);
    }
  });
});
