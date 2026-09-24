import { describe, expect, it } from 'vitest';
import type { DocNode } from './document';
import { diffText } from './diff';
import { createNewFile } from './file/format';
import { addRevision, MAX_REVISIONS, previousRevision, removeRevision } from './revisions';

const doc = (text: string): DocNode => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

describe('revisions', () => {
  it('adds revisions and skips duplicates of the latest one', () => {
    let file = createNewFile();
    file = addRevision(file, doc('a'), 'copy').file;
    const dup = addRevision(file, doc('a'), 'save');
    expect(dup.revision).toBeNull();
    expect(dup.file).toBe(file);
    file = addRevision(file, doc('b'), 'copy').file;
    expect(file.revisions.map((r) => r.reason)).toEqual(['copy', 'copy']);
  });

  it('always records manual revisions', () => {
    let file = addRevision(createNewFile(), doc('a'), 'copy').file;
    file = addRevision(file, doc('a'), 'manual').file;
    expect(file.revisions).toHaveLength(2);
  });

  it('records a revision when only the title changed', () => {
    let file = addRevision(createNewFile(), doc('a'), 'copy').file;
    file = addRevision({ ...file, title: '新しい題' }, doc('a'), 'copy').file;
    expect(file.revisions).toHaveLength(2);
  });

  it('caps the number of revisions', () => {
    let file = createNewFile();
    for (let i = 0; i < MAX_REVISIONS + 5; i++) file = addRevision(file, doc(String(i)), 'copy').file;
    expect(file.revisions).toHaveLength(MAX_REVISIONS);
    expect(file.revisions[0].content).toEqual(doc('5'));
  });

  it('finds previous and removes revisions', () => {
    let file = createNewFile();
    file = addRevision(file, doc('a'), 'copy').file;
    file = addRevision(file, doc('b'), 'copy').file;
    const [first, second] = file.revisions;
    expect(previousRevision(file, second.id)).toBe(first);
    expect(previousRevision(file, first.id)).toBeUndefined();
    expect(removeRevision(file, first.id).revisions).toEqual([second]);
  });
});

describe('diffText', () => {
  it('reports added and removed lines', () => {
    const r = diffText('a\nb\nc', 'a\nB\nc\nd');
    expect(r.lines).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'added', text: 'B' },
      { kind: 'same', text: 'c' },
      { kind: 'added', text: 'd' },
    ]);
    expect(r.added).toBe(2);
    expect(r.removed).toBe(1);
  });
});
