import { parseFile, serializeFile, type LaterPadFile } from '../file/format';

/**
 * ブラウザ内の作業中下書き。
 * リロードやタブを閉じても編集中の文書（リビジョン履歴を含む）を失わないための一時保存で、
 * 「1 文書 = 1 ファイル」の正式な保存とは別物として扱う。
 */
export interface Draft {
  file: LaterPadFile;
  /** 対応する保存ファイル名（未保存なら null） */
  fileName: string | null;
  /** 最後にファイル保存してから変更があるか */
  dirty: boolean;
}

const KEY = 'laterpad.draft.v2';
const LEGACY_KEY = 'laterpad.draft.v1';

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as { file: unknown; fileName?: unknown; dirty?: unknown };
      return {
        file: parseFile(JSON.stringify(data.file)),
        fileName: typeof data.fileName === 'string' ? data.fileName : null,
        dirty: data.dirty !== false,
      };
    }
    return migrateLegacy();
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ file: JSON.parse(serializeFile(draft.file)), fileName: draft.fileName, dirty: draft.dirty }),
    );
  } catch {
    // 容量超過などは無視（編集自体は継続できる）
  }
}

/** Phase 1 の下書き（本文のみ）を引き継ぐ */
function migrateLegacy(): Draft | null {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  const legacy = JSON.parse(raw) as { content: unknown; updatedAt?: string };
  const now = new Date().toISOString();
  const file = parseFile(
    JSON.stringify({
      format: 'laterpad',
      formatVersion: 1,
      title: '',
      createdAt: legacy.updatedAt ?? now,
      updatedAt: legacy.updatedAt ?? now,
      content: legacy.content,
      revisions: [],
    }),
  );
  localStorage.removeItem(LEGACY_KEY);
  return { file, fileName: null, dirty: true };
}
