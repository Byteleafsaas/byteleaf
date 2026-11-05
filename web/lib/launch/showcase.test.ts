import { describe, expect, it } from 'vitest';
import { SCRIPT, STORY_ORDER, currentScreen, initial, nextStory, reducer, type State } from './showcase';

const run = (s: State, ...targets: string[]) => targets.reduce((x, t) => reducer(x, { t: 'tap', target: t }), s);

describe('showcase stories', () => {
  it('walks the enquiry story by tapping the highlighted buttons, then Next step', () => {
    let s = reducer(initial, { t: 'pick', story: 'enquiry' });
    expect(currentScreen(s)).toBe('home');
    s = run(s, 'book', 'send');
    expect(currentScreen(s)).toBe('sent');
    s = reducer(s, { t: 'next' });
    expect(s.view).toBe('admin');
    expect(currentScreen(s)).toBe('enquiries');
    s = reducer(s, { t: 'next' });
    expect(s.finished).toBe(true);
  });

  it('shows the off-path hint for the wrong tap and stays on the step', () => {
    const s0 = reducer(initial, { t: 'pick', story: 'price' });
    const s = reducer(s0, { t: 'tap', target: 'publish' });
    expect(s.step).toBe(0);
    expect(s.hint).toBe(true);
    expect(reducer(s, { t: 'tap', target: 'row' }).hint).toBe(false);
  });

  it('switches between site and admin as the steps need', () => {
    let s = reducer(initial, { t: 'pick', story: 'photos' });
    expect(s.view).toBe('admin');
    s = run(s, 'upload', 'publish');
    expect(currentScreen(s)).toBe('gallery');
    expect(s.view).toBe('site');
  });

  it('restarts a story and chains to the next one', () => {
    let s = run(reducer(initial, { t: 'pick', story: 'price' }), 'row');
    s = reducer(s, { t: 'restart' });
    expect(s.step).toBe(0);
    expect(nextStory('price')).toBe('photos');
    expect(nextStory('photos')).toBeNull();
    expect(STORY_ORDER.every((k) => SCRIPT[k].length >= 3)).toBe(true);
  });

  it('browsing views clears any story', () => {
    const s = reducer(reducer(initial, { t: 'pick', story: 'price' }), { t: 'view', view: 'site' });
    expect(s.story).toBeNull();
    expect(currentScreen(s)).toBe('home');
  });
});
