import { describe, expect, it } from 'vitest';
import { extractJson } from './model-json';

describe('extractJson', () => {
  it('reads a plain object', () => {
    expect(extractJson('{"can_answer": true, "used": [1]}')).toEqual({ can_answer: true, used: [1] });
  });
  it('reads an object inside a code fence', () => {
    expect(extractJson('```json\n{"answer": "Yes."}\n```')).toEqual({ answer: 'Yes.' });
  });
  it('ignores text before and after the object', () => {
    expect(extractJson('Here you go: {"a": 1} Hope that helps.')).toEqual({ a: 1 });
  });
  it('is not fooled by braces inside strings', () => {
    expect(extractJson('{"text": "use {curly} braces and a \\" quote", "n": 2}')).toEqual({ text: 'use {curly} braces and a " quote', n: 2 });
  });
  it('handles nested objects and arrays', () => {
    expect(extractJson('{"items": [{"title": "A", "meta": {"x": 1}}]}')).toEqual({ items: [{ title: 'A', meta: { x: 1 } }] });
  });
  it('throws when there is no object or it is cut off', () => {
    expect(() => extractJson('no json here')).toThrow();
    expect(() => extractJson('{"a": 1')).toThrow();
  });
});
