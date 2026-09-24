import { describe, expect, it } from 'vitest';
import { createNewFile, fileNameFor, FileFormatError, parseFile, serializeFile } from './format';

describe('file format', () => {
  it('round-trips a file and keeps unknown fields', () => {
    const file = { ...createNewFile(), title: 'テスト', futureField: { a: 1 } };
    const parsed = parseFile(serializeFile(file));
    expect(parsed.title).toBe('テスト');
    expect(parsed.content).toEqual(file.content);
    expect(parsed.futureField).toEqual({ a: 1 });
  });

  it('rejects non-LaterPad JSON', () => {
    expect(() => parseFile('{"hello":1}')).toThrow(FileFormatError);
    expect(() => parseFile('not json')).toThrow(FileFormatError);
  });

  it('rejects newer format versions', () => {
    const text = JSON.stringify({ ...createNewFile(), formatVersion: 999 });
    expect(() => parseFile(text)).toThrow(/新しいバージョン/);
  });

  it('drops broken revisions', () => {
    const file = createNewFile();
    const text = JSON.stringify({
      ...file,
      revisions: [{ id: 'x', createdAt: 'now', reason: 'copy', content: file.content }, { bad: true }],
    });
    expect(parseFile(text).revisions).toHaveLength(1);
  });

  it('builds safe file names', () => {
    expect(fileNameFor('a/b:c')).toBe('a_b_c.laterpad');
    expect(fileNameFor('  ')).toBe('無題.laterpad');
  });
});
