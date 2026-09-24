import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocNode } from '../core/document';
import { isDocEmpty } from '../core/document';
import { saveFile, type FsFileHandle, type OpenedFile } from '../core/file/fileAccess';
import { createNewFile, titleFromFileName, type LaterPadFile } from '../core/file/format';
import { loadDraft, saveDraft } from '../core/storage/draft';

const DRAFT_SAVE_DELAY = 400;

export interface SessionState {
  /** 文書メタ情報とリビジョン。content は最後に同期した時点のもの（最新はエディタが持つ） */
  file: LaterPadFile;
  fileName: string | null;
  dirty: boolean;
  /** 文書を読み込み直すたびに変わるキー（エディタの作り直しに使う） */
  loadKey: number;
}

function initialState(): SessionState {
  const draft = loadDraft();
  if (draft) return { ...draft, loadKey: 0 };
  return { file: createNewFile(), fileName: null, dirty: false, loadKey: 0 };
}

/**
 * 編集中の 1 文書と保存ファイルの対応を管理する。
 * 本文の最新状態はエディタが持ち、getContent で取得する。
 */
export function useDocumentSession(getContent: () => DocNode | null) {
  const [state, setState] = useState<SessionState>(initialState);
  const handleRef = useRef<FsFileHandle | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const stateRef = useRef(state);
  stateRef.current = state;
  const getContentRef = useRef(getContent);
  getContentRef.current = getContent;

  /** エディタの最新内容を反映したファイルを組み立てる */
  const snapshot = useCallback((s: SessionState = stateRef.current): LaterPadFile => {
    const content = getContentRef.current() ?? s.file.content;
    return { ...s.file, content };
  }, []);

  const flushDraft = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const s = stateRef.current;
    saveDraft({ file: snapshot(s), fileName: s.fileName, dirty: s.dirty });
  }, [snapshot]);

  const scheduleDraft = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flushDraft, DRAFT_SAVE_DELAY);
  }, [flushDraft]);

  useEffect(() => {
    const onHide = () => timer.current !== undefined && flushDraft();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
  }, [flushDraft]);

  /** 本文が編集されたときに呼ぶ */
  const markChanged = useCallback(() => {
    if (!stateRef.current.dirty) setState((s) => ({ ...s, dirty: true }));
    scheduleDraft();
  }, [scheduleDraft]);

  const setTitle = useCallback(
    (title: string) => {
      setState((s) => ({ ...s, dirty: true, file: { ...s.file, title } }));
      scheduleDraft();
    },
    [scheduleDraft],
  );

  /** 文書全体を差し替える（新規作成・読み込み） */
  const replace = useCallback((next: Omit<SessionState, 'loadKey'>, handle: FsFileHandle | null) => {
    handleRef.current = handle;
    window.clearTimeout(timer.current);
    timer.current = undefined;
    saveDraft(next);
    setState((s) => ({ ...next, loadKey: s.loadKey + 1 }));
  }, []);

  const newDocument = useCallback(() => {
    replace({ file: createNewFile(), fileName: null, dirty: false }, null);
  }, [replace]);

  const openDocument = useCallback(
    (opened: OpenedFile) => {
      const file = opened.file.title ? opened.file : { ...opened.file, title: titleFromFileName(opened.fileName) };
      replace({ file, fileName: opened.fileName, dirty: false }, opened.handle);
    },
    [replace],
  );

  /** ファイルへ保存する。キャンセル時は null */
  const save = useCallback(
    async (saveAs = false) => {
      const s = stateRef.current;
      const file = { ...snapshot(s), updatedAt: new Date().toISOString() };
      const result = await saveFile(file, handleRef.current, saveAs);
      if (!result) return null;
      handleRef.current = result.handle;
      const next = { ...stateRef.current, file: { ...stateRef.current.file, updatedAt: file.updatedAt }, fileName: result.fileName, dirty: false };
      stateRef.current = next;
      setState(next);
      flushDraft();
      return result;
    },
    [snapshot, flushDraft],
  );

  /** 保存していない変更を失う操作の前に確認が必要か */
  const needsDiscardConfirm = useCallback(() => {
    const s = stateRef.current;
    if (!s.dirty) return false;
    const content = getContentRef.current();
    return !(content && isDocEmpty(content) && !s.file.title.trim() && s.file.revisions.length === 0);
  }, []);

  return useMemo(
    () => ({ state, markChanged, setTitle, newDocument, openDocument, save, snapshot, needsDiscardConfirm }),
    [state, markChanged, setTitle, newDocument, openDocument, save, snapshot, needsDiscardConfirm],
  );
}
