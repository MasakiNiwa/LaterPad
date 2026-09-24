import { diffLines } from 'diff';

export type DiffLineKind = 'same' | 'added' | 'removed';

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

export interface DiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
}

/** 2 つのテキストを行単位で比較する */
export function diffText(before: string, after: string): DiffResult {
  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  // 末尾の改行有無で最終行が別物と判定されないよう揃える
  const norm = (t: string) => (t === '' || t.endsWith('\n') ? t : `${t}\n`);
  for (const part of diffLines(norm(before), norm(after))) {
    const kind: DiffLineKind = part.added ? 'added' : part.removed ? 'removed' : 'same';
    const partLines = part.value.replace(/\n$/, '').split('\n');
    for (const text of partLines) lines.push({ kind, text });
    if (kind === 'added') added += partLines.length;
    if (kind === 'removed') removed += partLines.length;
  }
  return { lines, added, removed };
}
