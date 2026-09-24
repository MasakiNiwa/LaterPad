import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import { findMatches } from './search';

const schema = getSchema([StarterKit]);
const doc = Node.fromJSON(schema, {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Apple apple ' }, { type: 'text', text: 'APPLE', marks: [{ type: 'bold' }] }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'apple' }] },
  ],
});

describe('findMatches', () => {
  it('finds case-insensitive matches across text nodes with correct positions', () => {
    const matches = findMatches(doc, 'apple', false);
    expect(matches).toHaveLength(4);
    expect(matches.map((m) => doc.textBetween(m.from, m.to))).toEqual(['Apple', 'apple', 'APPLE', 'apple']);
  });

  it('respects case sensitivity', () => {
    expect(findMatches(doc, 'apple', true)).toHaveLength(2);
  });

  it('returns nothing for an empty term', () => {
    expect(findMatches(doc, '', false)).toEqual([]);
  });
});
