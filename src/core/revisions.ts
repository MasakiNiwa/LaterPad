import type { DocNode } from './document';
import { newId, type LaterPadFile, type Revision, type RevisionReason } from './file/format';

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

export function latestRevision(file: LaterPadFile): Revision | undefined {
  return file.revisions[file.revisions.length - 1];
}

/**
 * リビジョンを追加した新しいファイルを返す。
 * 直前のリビジョンと内容・タイトルが同じ場合は追加せず、元のファイルをそのまま返す
 * （同じ文章を何度コピーしても履歴が増えないようにする）。手動記録は常に追加する。
 */
export function addRevision(
  file: LaterPadFile,
  content: DocNode,
  reason: RevisionReason,
  options: { now?: Date; note?: string } = {},
): { file: LaterPadFile; revision: Revision | null } {
  const last = latestRevision(file);
  if (reason !== 'manual' && last && sameContent(last.content, content) && (last.title ?? '') === file.title) {
    return { file, revision: null };
  }
  const revision: Revision = {
    id: newId(),
    createdAt: (options.now ?? new Date()).toISOString(),
    reason,
    title: file.title,
    content,
    ...(options.note ? { note: options.note } : {}),
  };
  const revisions = [...file.revisions, revision].slice(-MAX_REVISIONS);
  return { file: { ...file, revisions }, revision };
}

export function removeRevision(file: LaterPadFile, id: string): LaterPadFile {
  return { ...file, revisions: file.revisions.filter((r) => r.id !== id) };
}

/** 指定したリビジョンの 1 つ前（古い側）のリビジョン */
export function previousRevision(file: LaterPadFile, id: string): Revision | undefined {
  const i = file.revisions.findIndex((r) => r.id === id);
  return i > 0 ? file.revisions[i - 1] : undefined;
}
