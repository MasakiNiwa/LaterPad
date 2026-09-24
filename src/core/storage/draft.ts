import type { DocNode } from '../document';

/**
 * ブラウザ内の作業中下書き。
 * リロードやタブを閉じた時に内容を失わないための一時保存で、
 * 「1 文書 = 1 ファイル」の正式な保存とは別物として扱う。
 */
export interface Draft {
  content: DocNode;
  updatedAt: string;
}

const KEY = 'laterpad.draft.v1';

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(content: DocNode): void {
  try {
    const draft: Draft = { content, updatedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // 容量超過などは無視（編集自体は継続できる）
  }
}
