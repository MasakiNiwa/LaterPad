import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Snackbar from '@mui/material/Snackbar';
import ButtonBase from '@mui/material/ButtonBase';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SaveAsOutlinedIcon from '@mui/icons-material/SaveAsOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SearchIcon from '@mui/icons-material/Search';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import HistoryIcon from '@mui/icons-material/History';
import { Brand } from '../components/Brand';
import { ActionBar, ActionButton, ActionDivider } from '../components/ActionBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PreviewDialog } from '../components/PreviewDialog';
import { HistoryDrawer } from '../components/history/HistoryDrawer';
import type { DocNode } from '../core/document';
import { openFileWithPicker, readFile, type OpenedFile } from '../core/file/fileAccess';
import { FileFormatError, type Revision } from '../core/file/format';
import { exportDoc } from '../core/export';
import { copyText } from '../lib/clipboard';
import { createExtensions } from '../editor/extensions';
import { editorContentSx } from '../editor/editorStyles';
import { LinkDialog } from '../editor/LinkDialog';
import { Toolbar } from '../editor/Toolbar';
import { SearchBar } from '../editor/SearchBar';
import { ContextBar } from '../editor/ContextBar';
import { useCopyForAI } from '../editor/useCopyForAI';
import { useDocumentSession } from '../editor/useDocumentSession';
import { modKey } from '../lib/platform';
import { onNotify } from '../lib/notify';
import { isCoarsePointer, useVisualViewport } from '../lib/viewport';
import { useSettings } from '../settings/SettingsContext';

/** 上部バー各段の最大幅（本文の幅と揃える） */
const HEADER_WIDTH = 900;

type PendingAction = { kind: 'new' } | { kind: 'open'; opened?: OpenedFile };

export function EditorPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const editorRef = useRef<Editor | null>(null);
  const session = useDocumentSession(
    () => (editorRef.current?.getJSON() as DocNode | undefined) ?? null,
    settings.restoreOnStartup,
  );
  const { state } = session;

  const editor = useEditor(
    {
      extensions: createExtensions('ここに文章を書く… 書式はツールバーから。書き終えたら「AI用にコピー」'),
      content: state.file.content,
      // スマホでは起動・読み込み時にソフトウェアキーボードが勝手に開かないようにする
      autofocus: isCoarsePointer() ? false : 'end',
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: { 'aria-label': '本文', spellcheck: 'false' },
      },
      onUpdate: () => session.markChanged(),
    },
    // 別の文書を読み込んだらエディタを作り直す（Undo 履歴もリセットされる）
    [state.loadKey],
  );
  editorRef.current = editor;

  const stats = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? countStats(e) : { chars: 0, lines: 0 }),
  });
  const history = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ canUndo: !!e?.can().undo(), canRedo: !!e?.can().redo() }),
  });

  // ソフトウェアキーボード表示時も上部バー・ステータスバーを見える位置に保つ
  const viewport = useVisualViewport();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // カーソル位置へのスクロールで、上部バーやステータスバーの裏に隠れないようにする
  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        scrollMargin: { top: headerHeight + 16, bottom: 56, left: 0, right: 0 },
        scrollThreshold: { top: headerHeight + 16, bottom: 56, left: 0, right: 0 },
      },
    });
  }, [editor, headerHeight]);

  const { render, copy } = useCopyForAI(editor, state.file.title);
  const [toast, setToast] = useState<string | null>(null);
  /** コピー直後のお知らせに「内容を見る」を付ける */
  const [toastPreview, setToastPreview] = useState(false);
  const notify = useCallback((message: string | null, withPreview = false) => {
    setToast(message);
    setToastPreview(withPreview);
  }, []);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState({ text: '', formatLabel: '' });
  const [linkOpen, setLinkOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Revision | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Revision | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [searchFocusKey, setSearchFocusKey] = useState(0);

  const openSearch = useCallback(
    (withReplace: boolean) => {
      // 選択中の文字があれば検索語にする
      if (editor) {
        const { from, to, empty } = editor.state.selection;
        const selected = empty ? '' : editor.state.doc.textBetween(from, to, ' ');
        if (selected && !selected.includes('\n')) editor.commands.setSearch({ term: selected });
      }
      setSearchOpen(true);
      if (withReplace) setReplaceOpen(true);
      setSearchFocusKey((k) => k + 1);
    },
    [editor],
  );

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setReplaceOpen(false);
    if (!isCoarsePointer()) editor?.commands.focus();
  }, [editor]);

  /** 戻す・進む。スマホで入力中でなければキーボードを開かずに実行する */
  const runHistory = useCallback(
    (kind: 'undo' | 'redo') => {
      if (!editor) return;
      const chain = editor.chain();
      if (!isCoarsePointer() || editor.isFocused) chain.focus();
      chain[kind]().run();
    },
    [editor],
  );

  const recordRevision = useCallback(() => {
    const rev = session.addRevision('manual');
    notify(rev ? '今の状態を履歴に記録しました' : '記録できませんでした');
  }, [session]);

  const handleCopy = useCallback(async () => {
    const result = await copy();
    if (result.empty) notify('コピーする内容がありません');
    else if (result.ok) {
      // 「AIに渡した時点」を履歴として残す
      if (settings.revisionOnCopy) session.addRevision('copy');
      notify(`AI用にコピーしました（${result.formatLabel}・${result.length.toLocaleString()} 文字）`, true);
    } else notify('コピーできませんでした。ブラウザの権限を確認してください');
  }, [copy, session, settings.revisionOnCopy]);

  // ------------------------------------------------------------ revisions

  const getCurrentContent = useCallback(
    () => (editorRef.current?.getJSON() as DocNode | undefined) ?? state.file.content,
    [state.file.content],
  );

  const restoreRevision = useCallback(
    (revision: Revision) => {
      if (!editor) return;
      // 復元前の状態を残しておき、復元自体も取り消せるようにする
      session.addRevision('restore');
      const chain = editor.chain().setContent(revision.content, { emitUpdate: true });
      if (!isCoarsePointer()) chain.focus('start');
      chain.run();
      setHistoryOpen(false);
      notify(`${formatShort(revision.createdAt)} の版に戻しました`);
    },
    [editor, session],
  );

  const copyRevision = useCallback(
    async (revision: Revision) => {
      const { exporter, text } = exportDoc(revision.content, settings.copyFormat, { title: revision.title });
      try {
        await copyText(text);
        notify(`この版をコピーしました（${exporter.label}・${text.length.toLocaleString()} 文字）`);
      } catch {
        notify('コピーできませんでした');
      }
    },
    [settings.copyFormat],
  );

  const openPreview = useCallback(() => {
    const { exporter, text } = render();
    setPreview({ text, formatLabel: exporter.label });
    setPreviewOpen(true);
  }, [render]);

  // ------------------------------------------------------------ file operations

  const handleSave = useCallback(
    async (saveAs = false) => {
      try {
        const result = await session.save(saveAs);
        if (!result) return;
        notify(
          result.downloaded
            ? `「${result.fileName}」をダウンロードしました`
            : `「${result.fileName}」に保存しました`,
        );
      } catch (e) {
        console.error(e);
        notify('保存できませんでした');
      }
    },
    [session],
  );

  const runPending = useCallback(
    async (action: PendingAction) => {
      if (action.kind === 'new') {
        session.newDocument();
        notify('新しい文書を作成しました');
        return;
      }
      try {
        const opened = action.opened ?? (await openFileWithPicker());
        if (!opened) return;
        session.openDocument(opened);
        notify(`「${opened.fileName}」を開きました`);
      } catch (e) {
        console.error(e);
        notify(e instanceof FileFormatError ? e.message : 'ファイルを開けませんでした');
      }
    },
    [session],
  );

  /** 未保存の変更がある場合は確認してから実行する */
  const guarded = useCallback(
    (action: PendingAction) => {
      if (session.needsDiscardConfirm()) setPending(action);
      else void runPending(action);
    },
    [session, runPending],
  );

  // ファイルのドラッグ＆ドロップで開く
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const onDragOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = async (e: DragEvent) => {
      const f = e.dataTransfer?.files?.[0];
      if (!f || !/\.(laterpad|json)$/i.test(f.name)) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        guarded({ kind: 'open', opened: await readFile(f) });
      } catch (err) {
        notify(err instanceof FileFormatError ? err.message : 'ファイルを開けませんでした');
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop, true);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop, true);
    };
  }, [guarded]);

  // リスト項目内の Enter の動作（設定）
  useEffect(() => {
    if (editor) editor.storage.listEnter.lineBreak = settings.listEnterLineBreak;
  }, [editor, settings.listEnterLineBreak]);

  // エディタ内の部品（意味ブロックのメニューなど）からのお知らせ
  useEffect(() => onNotify((message) => notify(message)), [notify]);

  // アプリ全体のショートカット
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        void handleCopy();
      } else if (!e.shiftKey && !e.altKey && key === 's') {
        e.preventDefault();
        void handleSave();
      } else if (!e.shiftKey && !e.altKey && key === 'o') {
        e.preventDefault();
        guarded({ kind: 'open' });
      } else if (!e.shiftKey && !e.altKey && key === 'f') {
        e.preventDefault();
        openSearch(false);
      } else if ((!e.shiftKey && !e.altKey && key === 'h') || (e.altKey && key === 'f')) {
        e.preventDefault();
        openSearch(true);
      } else if (!e.shiftKey && key === 'k' && editor?.isFocused) {
        e.preventDefault();
        setLinkOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCopy, handleSave, guarded, editor, openSearch]);

  const mod = modKey();
  const saveStatus = !state.fileName ? 'まだ保存していません' : state.dirty ? '未保存の変更あり' : '保存済み';

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        ref={headerRef}
        position="fixed"
        style={{ transform: viewport.offsetTop ? `translateY(${viewport.offsetTop}px)` : undefined }}
        sx={(t) => ({ borderBottom: `1px solid ${t.m3.outlineVariant}` })}
      >
        {/* 1 段目: ロゴ・文書タイトル・設定・ヘルプ（キーボード表示中は省いて本文の領域を確保） */}
        <Box sx={{ display: viewport.keyboardOpen ? 'none' : 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, px: { xs: 1.5, sm: 2 }, pt: 1.25, pb: 0.5, maxWidth: HEADER_WIDTH, width: '100%', mx: 'auto' }}>
          <Brand hideTextOnMobile />
          <InputBase
            value={state.file.title}
            onChange={(e) => session.setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                // commands.focus は非同期のため、先に同期的にフォーカスを移して入力の取りこぼしを防ぐ
                editor?.view.focus();
                editor?.commands.focus('start');
              }
            }}
            placeholder="無題の文書"
            inputProps={{ 'aria-label': '文書タイトル（ファイル名に使われます）', maxLength: 200 }}
            endAdornment={
              <Tooltip title={saveStatus}>
                <Box
                  component="span"
                  aria-label={saveStatus}
                  sx={(t) => ({
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    ml: 1,
                    bgcolor: state.dirty ? t.palette.warning.main : state.fileName ? t.palette.success.main : t.m3.outlineVariant,
                  })}
                />
              </Tooltip>
            }
            sx={(t) => ({
              flex: 1,
              minWidth: 0,
              maxWidth: 560,
              height: 40,
              px: 2,
              borderRadius: '20px',
              border: `1px solid ${t.m3.outlineVariant}`,
              bgcolor: t.m3.surface,
              fontSize: 16,
              '&.Mui-focused': { borderColor: t.palette.primary.main },
            })}
          />
          <Box sx={{ flex: { xs: 0, md: 1 } }} />
          <Tooltip title="設定">
            <IconButton aria-label="設定" onClick={() => navigate('/settings')}>
              <SettingsOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="ヘルプ">
            <IconButton aria-label="ヘルプ" edge="end" onClick={() => navigate('/help')}>
              <HelpOutlineOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 2 段目: ファイル・編集の操作 */}
        <Box sx={{ maxWidth: HEADER_WIDTH, width: '100%', mx: 'auto' }}>
          <ActionBar>
            <ActionButton icon={<NoteAddOutlinedIcon />} label="新規" tooltip="新しい文書" onClick={() => guarded({ kind: 'new' })} />
            <ActionButton icon={<FolderOpenOutlinedIcon />} label="開く" tooltip={`開く（${mod}+O）`} onClick={() => guarded({ kind: 'open' })} />
            <ActionDivider />
            <ActionButton
              icon={<SaveOutlinedIcon />}
              label="保存"
              accent={state.dirty}
              tooltip={state.fileName ? `「${state.fileName}」に上書き保存（${mod}+S）` : `保存（${mod}+S）`}
              onClick={() => void handleSave()}
            />
            <ActionButton icon={<SaveAsOutlinedIcon />} label="別名保存" tooltip="名前を付けて保存" onClick={() => void handleSave(true)} />
            <ActionDivider />
            <ActionButton icon={<UndoIcon />} label="戻す" tooltip={`元に戻す（${mod}+Z）`} keepFocus disabled={!history?.canUndo} onClick={() => runHistory('undo')} />
            <ActionButton icon={<RedoIcon />} label="進む" tooltip={`やり直す（${mod}+Shift+Z）`} keepFocus disabled={!history?.canRedo} onClick={() => runHistory('redo')} />
            <ActionDivider />
            <ActionButton icon={<SearchIcon />} label="検索" tooltip={`検索・置換（${mod}+F）`} active={searchOpen} onClick={() => (searchOpen ? closeSearch() : openSearch(false))} />
            <ActionButton icon={<HistoryIcon />} label="履歴" tooltip="履歴（過去の版・今の状態を記録）" onClick={() => setHistoryOpen(true)} />
            <ActionButton icon={<VisibilityOutlinedIcon />} label="プレビュー" tooltip="コピー内容をプレビュー" hideOnMobile onClick={openPreview} />
            <ActionButton icon={<ContentCopyIcon />} label="AI用にコピー" tooltip={`AI用にコピー（${mod}+Shift+Enter）`} primary onClick={() => void handleCopy()} />
          </ActionBar>
        </Box>

        {editor && (
          <>
            <Divider />
            <Box sx={{ maxWidth: HEADER_WIDTH, width: '100%', mx: 'auto' }}>
              <Toolbar editor={editor} onLinkClick={() => setLinkOpen(true)} />
            </Box>
            <Box sx={{ maxWidth: HEADER_WIDTH, width: '100%', mx: 'auto' }}>
              <ContextBar editor={editor} />
            </Box>
            {searchOpen && (
              <SearchBar
                editor={editor}
                replaceOpen={replaceOpen}
                onToggleReplace={() => setReplaceOpen((v) => !v)}
                onClose={closeSearch}
                onReplacedAll={(n) => notify(`${n} 件を置換しました`)}
                focusKey={searchFocusKey}
              />
            )}
          </>
        )}
      </AppBar>

      {/* 固定表示の上部バーの分だけ本文を下げる */}
      <Box aria-hidden sx={{ height: headerHeight, flexShrink: 0 }} />

      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: 900,
          mx: 'auto',
          px: settings.compact ? { xs: 1.25, sm: 2 } : { xs: 2, sm: 4 },
          pt: settings.compact ? { xs: 1, sm: 1.5 } : { xs: 2, sm: 3 },
          pb: 8,
        }}
        onClick={(e) => {
          // 余白クリックでも入力を始められるようにする
          if (e.target === e.currentTarget) editor?.commands.focus('end');
        }}
      >
        <Box sx={editorContentSx(settings.fontSize, settings.lineHeight, settings.compact)}>
          <EditorContent editor={editor} />
        </Box>
      </Box>

      <Box
        component="footer"
        style={{ transform: viewport.bottomInset ? `translateY(-${viewport.bottomInset}px)` : undefined }}
        sx={(t) => ({
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2,
          minHeight: 32,
          // キーボード表示中は画面下端ではないので、ホームバー分の余白は不要
          pb: viewport.keyboardOpen ? 0 : 'env(safe-area-inset-bottom)',
          bgcolor: t.m3.surfaceContainer,
          color: t.m3.onSurfaceVariant,
          borderTop: `1px solid ${t.m3.outlineVariant}`,
        })}
      >
        <Typography variant="caption" noWrap sx={{ flex: 1, minWidth: 0 }} title={state.fileName ?? undefined}>
          {state.fileName ?? '新しい文書'}
          {' · '}
          {saveStatus}
        </Typography>
        <Typography variant="caption" sx={{ flexShrink: 0 }}>
          {(stats?.chars ?? 0).toLocaleString()} 字・{(stats?.lines ?? 0).toLocaleString()} 行
        </Typography>
        {/* スマホでは操作バーにプレビューを置けないため、ここに控えめな入り口を置く */}
        <ButtonBase
          onClick={openPreview}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="コピー内容をプレビュー"
          sx={(t) => ({
            display: { xs: 'inline-flex', sm: 'none' },
            flexShrink: 0,
            alignItems: 'center',
            gap: 0.25,
            ml: -0.5,
            px: 1,
            py: 0.5,
            borderRadius: '8px',
            fontSize: 12,
            fontWeight: 600,
            color: t.palette.primary.main,
          })}
        >
          プレビュー
          <ChevronRightIcon sx={{ fontSize: 16 }} />
        </ButtonBase>
      </Box>


      {editor && <LinkDialog editor={editor} open={linkOpen} onClose={() => setLinkOpen(false)} />}
      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        text={preview.text}
        formatLabel={preview.formatLabel}
        onCopy={() => {
          setPreviewOpen(false);
          void handleCopy();
        }}
      />
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        file={state.file}
        exporterId={settings.copyFormat}
        getCurrentContent={getCurrentContent}
        onRecord={recordRevision}
        onRestore={setRestoreTarget}
        onCopy={(r) => void copyRevision(r)}
        onDelete={setDeleteTarget}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="この履歴を削除しますか？"
        message="削除した履歴は元に戻せません。"
        confirmLabel="削除"
        danger
        onConfirm={() => {
          if (!deleteTarget) return;
          session.removeRevision(deleteTarget.id);
          notify('履歴を削除しました');
        }}
        onClose={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!restoreTarget}
        title="この版に戻しますか？"
        message="現在の内容は「復元前の状態」として履歴に残るため、あとから戻すこともできます。"
        confirmLabel="この版に戻す"
        onConfirm={() => restoreTarget && restoreRevision(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
      />
      <ConfirmDialog
        open={!!pending}
        title="保存されていない変更があります"
        message={
          pending?.kind === 'new'
            ? '現在の文書をファイルに保存せずに、新しい文書を作成しますか？'
            : '現在の文書をファイルに保存せずに、別の文書を開きますか？'
        }
        confirmLabel="保存せずに続ける"
        danger
        onConfirm={() => pending && void runPending(pending)}
        onClose={() => setPending(null)}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={toastPreview ? 4000 : 2500}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          notify(null);
          setToastPreview(false);
        }}
        message={toast}
        action={
          toastPreview ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                notify(null);
                setToastPreview(false);
                openPreview();
              }}
              sx={{ fontWeight: 700, color: 'primary.light' }}
            >
              内容を見る
            </Button>
          ) : undefined
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        style={{ transform: viewport.bottomInset ? `translateY(-${viewport.bottomInset}px)` : undefined }}
        sx={{ bottom: { xs: 'calc(48px + env(safe-area-inset-bottom))', sm: 48 } }}
      />
      <Snackbar
        open={!!session.previousDraft && !restoreDismissed}
        autoHideDuration={10000}
        onClose={(_, reason) => reason !== 'clickaway' && setRestoreDismissed(true)}
        message="前回の内容を復元できます"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              setRestoreDismissed(true);
              session.restorePrevious();
              notify('前回の内容を復元しました');
            }}
            sx={{ fontWeight: 700, color: 'primary.light' }}
          >
            復元
          </Button>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 'calc(48px + env(safe-area-inset-bottom))', sm: 48 } }}
      />
    </Box>
  );
}

/** 文字数（改行を除く）と行数（段落・見出し・セルなどのテキスト行と改行の数） */
function countStats(editor: Editor): { chars: number; lines: number } {
  let chars = 0;
  let lines = 0;
  editor.state.doc.descendants((node) => {
    if (node.isTextblock) lines++;
    else if (node.type.name === 'hardBreak') lines++;
    else if (node.isText) chars += node.text!.length;
    return true;
  });
  const empty = chars === 0 && editor.isEmpty;
  return { chars, lines: empty ? 0 : lines };
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
