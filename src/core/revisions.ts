import type { DocNode } from './document';
import { plainTextOf } from './document';
import { newId, normalizeRevisionGraph, type LaterPadFile, type Revision, type RevisionReason } from './file/format';

/** 1 文書あたりに保持するリビジョンの上限（古いものから削除） */
export const MAX_REVISIONS = 200;

export const REVISION_REASON_LABELS: Record<RevisionReason, string> = {
  copy: 'AI用にコピー',
  save: 'ファイルに保存',
  manual: '手動で記録',
  restore: '復元前の状態',
};

export function sameContent(a: DocNode, b: DocNode): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function findRevision(file: LaterPadFile, id: string | null | undefined): Revision | undefined {
  return id ? file.revisions.find((r) => r.id === id) : undefined;
}

/** 現在の本文の元になっている版（なければ最新の版） */
export function headRevision(file: LaterPadFile): Revision | undefined {
  return findRevision(file, file.headRevisionId) ?? file.revisions[file.revisions.length - 1];
}

export function latestRevision(file: LaterPadFile): Revision | undefined {
  return file.revisions[file.revisions.length - 1];
}

/**
 * 現在の内容を版として記録した新しいファイルを返す。
 * 新しい版の親は「現在の元になっている版」で、記録後はその新しい版が元になる。
 * 過去の版に戻してから記録すると、そこから枝分かれする。
 * 元の版と内容・タイトルが同じ場合は記録しない（何度コピーしても増えない）。手動記録は常に記録する。
 */
export function addRevision(
  file: LaterPadFile,
  content: DocNode,
  reason: RevisionReason,
  options: { now?: Date; note?: string } = {},
): { file: LaterPadFile; revision: Revision | null } {
  const head = headRevision(file);
  if (reason !== 'manual' && head && sameContent(head.content, content) && (head.title ?? '') === file.title) {
    return { file, revision: null };
  }
  const revision: Revision = {
    id: newId(),
    createdAt: (options.now ?? new Date()).toISOString(),
    reason,
    title: file.title,
    content,
    parentId: head?.id ?? null,
    ...(options.note ? { note: options.note } : {}),
  };
  // 上限を超えた古い版を落とし、つながりを整え直す
  const graph = normalizeRevisionGraph([...file.revisions, revision].slice(-MAX_REVISIONS), revision.id);
  return { file: { ...file, ...graph }, revision };
}

/** 版を削除する。その版から派生した版は、削除した版の親につなぎ直す */
export function removeRevision(file: LaterPadFile, id: string): LaterPadFile {
  const target = findRevision(file, id);
  if (!target) return file;
  const revisions = file.revisions
    .filter((r) => r.id !== id)
    .map((r) => (r.parentId === id ? { ...r, parentId: target.parentId ?? null } : r));
  const headRevisionId = file.headRevisionId === id ? (target.parentId ?? null) : file.headRevisionId;
  return { ...file, ...normalizeRevisionGraph(revisions, headRevisionId) };
}

/** すべての版を削除する */
export function clearRevisions(file: LaterPadFile): LaterPadFile {
  return { ...file, revisions: [], headRevisionId: null };
}

/** 版に名前（メモ）を付ける。空なら外す */
export function renameRevision(file: LaterPadFile, id: string, note: string): LaterPadFile {
  const trimmed = note.trim();
  return {
    ...file,
    revisions: file.revisions.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r };
      if (trimmed) next.note = trimmed;
      else delete next.note;
      return next;
    }),
  };
}

/** 現在の元になる版を切り替える（その版に戻したとき） */
export function setHead(file: LaterPadFile, id: string): LaterPadFile {
  return findRevision(file, id) ? { ...file, headRevisionId: id } : file;
}

/** 指定した版の親の版 */
export function parentRevision(file: LaterPadFile, id: string): Revision | undefined {
  return findRevision(file, findRevision(file, id)?.parentId);
}

/** 版の文字数（改行を除く） */
export function revisionLength(r: Revision): number {
  return plainTextOf(r.content).replace(/\n/g, '').length;
}

// ---------------------------------------------------------------- tree layout

export interface GraphRow {
  revision: Revision;
  /** この版の丸を描く列 */
  lane: number;
  /** この行の上端で通っている線の列（上＝新しい側から来る線） */
  lanesAbove: (string | null)[];
  /** この行の下端で通っている線の列（下＝古い側へ続く線） */
  lanesBelow: (string | null)[];
  /** この版を親とする子の線がつながってくる列（丸へ合流する線） */
  mergingFrom: number[];
  /** 子の版の数（分岐点かどうか） */
  childCount: number;
}

/**
 * 版の親子関係を、新しい順の一覧で描ける「列（レーン）」に割り当てる。
 * git の log --graph と同じ考え方で、分岐があれば列が増える。
 * 各列は「次に来るはずの版の ID」を持ち、その版の行で丸になる。
 */
export function layoutRevisionGraph(revisions: Revision[]): { rows: GraphRow[]; laneCount: number } {
  // 新しい順。同じ時刻なら後から記録された（配列の後ろの）方を新しいとみなす
  const ordered = revisions
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.createdAt < b.r.createdAt ? 1 : a.r.createdAt > b.r.createdAt ? -1 : b.i - a.i))
    .map((x) => x.r);
  const ids = new Set(revisions.map((r) => r.id));
  const childCount = new Map<string, number>();
  for (const r of revisions) if (r.parentId && ids.has(r.parentId)) childCount.set(r.parentId, (childCount.get(r.parentId) ?? 0) + 1);

  let lanes: (string | null)[] = [];
  let laneCount = 0;
  const rows: GraphRow[] = [];
  for (const r of ordered) {
    const lanesAbove = [...lanes];
    const matching = lanes.map((id, i) => (id === r.id ? i : -1)).filter((i) => i >= 0);
    let lane: number;
    if (matching.length > 0) {
      lane = matching[0];
    } else {
      // 新しい枝の先端: 空いている列、なければ右端に追加
      lane = lanes.indexOf(null);
      if (lane === -1) lane = lanes.length;
    }
    const next = [...lanes];
    next[lane] = r.parentId && ids.has(r.parentId) ? r.parentId : null;
    // 同じ版を待っていた他の列は、ここで合流して終わる
    for (const i of matching.slice(1)) next[i] = null;
    while (next.length && next[next.length - 1] === null) next.pop();
    rows.push({
      revision: r,
      lane,
      lanesAbove,
      lanesBelow: next,
      mergingFrom: matching.slice(1),
      childCount: childCount.get(r.id) ?? 0,
    });
    lanes = next;
    laneCount = Math.max(laneCount, lanesAbove.length, next.length, lane + 1);
  }
  return { rows, laneCount };
}
