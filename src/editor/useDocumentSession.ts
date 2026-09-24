import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocNode } from '../core/document';
import { isDocEmpty } from '../core/document';
import { saveFile, type FsFileHandle, type OpenedFile } from '../core/file/fileAccess';
import { createNewFile, titleFromFileName, type LaterPadFile, type Revision, type RevisionReason } from '../core/file/format';
import { addRevision as addRevisionTo, removeRevision as removeRevisionFrom } from '../core/revisions';
import { loadDraft, loadPreviousDraft, saveDraft, stashDraftAsPrevious, type Draft } from '../core/storage/draft';

const DRAFT_SAVE_DELAY = 400;

export interface SessionState {
  /** 文書メタ情報とリビジョン。content は最後に同期した時点のもの（最新はエディタが持つ） */
  file: LaterPadFile;
  fileName: string | null;
  dirty: boolean;
  /** 文書を読み込み直すたびに変わるキー（エディタの作り直しに使う） */
  loadKey: number;
}

function hasContent(draft: Draft): boolean {
  return !isDocEmpty(draft.file.content) || !!draft.file.title.trim() || draft.file.revisions.length > 0;
}

/**
 * 起動時の状態。
 * 既定では空の文書で始め、前回の内容は「復元できる下書き」として退避しておく。
 * 設定で「前回の内容を開く」が有効なら、そのまま続きから始める。
 */
function initialState(restorePrevious: boolean): { state: SessionState; previous: Draft | null } {
  const draft = loadDraft();
  if (draft && restorePrevious) return { state: { ...draft, loadKey: 0 }, previous: null };
  if (draft && hasContent(draft)) stashDraftAsPrevious(draft);
  const empty: Omit<SessionState, 'loadKey'> = { file: createNewFile(), fileName: null, dirty: false };
  saveDraft(empty);
  const previous = loadPreviousDraft();
  return { state: { ...empty, loadKey: 0 }, previous: previous && hasContent(previous) ? previous : null };
}

/**
 * 編集中の 1 文書と保存ファイルの対応を管理する。
 * 本文の最新状態はエディタが持ち、getContent で取得する。
 */
export function useDocumentSession(getContent: () => DocNode | null, restoreOnStartup: boolean) {
  const [initial] = useState(() => initialState(restoreOnStartup));
  const [state, setState] = useState<SessionState>(initial.state);
  /** 起動時に退避した前回の内容（復元できるもの） */
  const [previousDraft, setPreviousDraft] = useState<Draft | null>(initial.previous);
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

  /** 前回の内容を復元する */
  const restorePrevious = useCallback(() => {
    if (!previousDraft) return;
    replace(previousDraft, null);
    setPreviousDraft(null);
  }, [previousDraft, replace]);

  const openDocument = useCallback(
    (opened: OpenedFile) => {
      const file = opened.file.title ? opened.file : { ...opened.file, title: titleFromFileName(opened.fileName) };
      replace({ file, fileName: opened.fileName, dirty: false }, opened.handle);
    },
    [replace],
  );

  /** 現在の内容をリビジョンとして記録する。直前と同じ内容なら記録せず null */
  const addRevision = useCallback(
    (reason: RevisionReason, note?: string): Revision | null => {
      const s = stateRef.current;
      const content = getContentRef.current() ?? s.file.content;
      const result = addRevisionTo({ ...s.file, content }, content, reason, { note });
      if (!result.revision) return null;
      const next = { ...s, dirty: true, file: { ...s.file, revisions: result.file.revisions } };
      stateRef.current = next;
      setState(next);
      scheduleDraft();
      return result.revision;
    },
    [scheduleDraft],
  );

  const removeRevision = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const next = { ...s, dirty: true, file: removeRevisionFrom(s.file, id) };
      stateRef.current = next;
      setState(next);
      scheduleDraft();
    },
    [scheduleDraft],
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
    () => ({
      state,
      markChanged,
      setTitle,
      newDocument,
      openDocument,
      save,
      snapshot,
      needsDiscardConfirm,
      addRevision,
      removeRevision,
      previousDraft,
      restorePrevious,
    }),
    [state, markChanged, setTitle, newDocument, openDocument, save, snapshot, needsDiscardConfirm, addRevision, removeRevision, previousDraft, restorePrevious],
  );
}
