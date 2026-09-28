import { describe, expect, it } from 'vitest';
import type { DocNode } from './document';
import { diffText } from './diff';
import { createNewFile } from './file/format';
import {
  addRevision,
  clearRevisions,
  layoutRevisionGraph,
  MAX_REVISIONS,
  parentRevision,
  removeRevision,
  renameRevision,
  setHead,
} from './revisions';
import { parseFile, serializeFile } from './file/format';

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

  it('links parents and reconnects children on removal', () => {
    let file = createNewFile();
    file = addRevision(file, doc('a'), 'copy').file;
    file = addRevision(file, doc('b'), 'copy').file;
    file = addRevision(file, doc('c'), 'copy').file;
    const [a, b, c] = file.revisions;
    expect(parentRevision(file, b.id)?.id).toBe(a.id);
    expect(parentRevision(file, a.id)).toBeUndefined();
    const removed = removeRevision(file, b.id);
    expect(removed.revisions.find((r) => r.id === c.id)?.parentId).toBe(a.id);
    expect(removeRevision(file, c.id).headRevisionId).toBe(b.id);
  });

  it('branches when recording after going back to an older version', () => {
    let file = createNewFile();
    file = addRevision(file, doc('a'), 'copy').file;
    file = addRevision(file, doc('b'), 'copy').file;
    const [a] = file.revisions;
    file = setHead(file, a.id);
    file = addRevision(file, doc('a2'), 'copy').file;
    const a2 = file.revisions[2];
    expect(a2.parentId).toBe(a.id);
    expect(file.headRevisionId).toBe(a2.id);
    const { rows, laneCount } = layoutRevisionGraph(file.revisions);
    expect(laneCount).toBe(2);
    // 新しい順: a2, b, a。a で 2 本の枝が合流する
    expect(rows.map((r) => r.revision.id)).toEqual([a2.id, file.revisions[1].id, a.id]);
    expect(rows[2].mergingFrom.length).toBe(1);
    expect(rows[2].childCount).toBe(2);
  });

  it('migrates legacy linear revisions and keeps graph fields through save/load', () => {
    const file = createNewFile();
    const legacy = {
      ...file,
      revisions: [
        { id: 'x', createdAt: '2026-01-01T00:00:00Z', reason: 'copy', content: doc('1') },
        { id: 'y', createdAt: '2026-01-02T00:00:00Z', reason: 'copy', content: doc('2') },
      ],
    };
    const parsed = parseFile(JSON.stringify(legacy));
    expect(parsed.revisions.map((r) => r.parentId)).toEqual([null, 'x']);
    expect(parsed.headRevisionId).toBe('y');
    expect(parseFile(serializeFile(parsed)).headRevisionId).toBe('y');
  });

  it('renames and clears revisions', () => {
    let file = addRevision(createNewFile(), doc('a'), 'copy').file;
    const id = file.revisions[0].id;
    file = renameRevision(file, id, ' 完成版 ');
    expect(file.revisions[0].note).toBe('完成版');
    expect(renameRevision(file, id, '').revisions[0].note).toBeUndefined();
    expect(clearRevisions(file).revisions).toEqual([]);
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
