import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SaveAsOutlinedIcon from '@mui/icons-material/SaveAsOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SearchIcon from '@mui/icons-material/Search';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
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
import { TableQuickBar } from '../editor/TableQuickBar';
import { useCopyForAI } from '../editor/useCopyForAI';
import { useDocumentSession } from '../editor/useDocumentSession';
import { modKey } from '../lib/platform';
import { useSettings } from '../settings/SettingsContext';

/** 上部バー各段の最大幅（本文の幅と揃える） */
const HEADER_WIDTH = 900;

type PendingAction = { kind: 'new' } | { kind: 'open'; opened?: OpenedFile };

export function EditorPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const editorRef = useRef<Editor | null>(null);
  const session = useDocumentSession(() => (editorRef.current?.getJSON() as DocNode | undefined) ?? null);
  const { state } = session;

  const editor = useEditor(
    {
      extensions: createExtensions('ここに文章を書く… 書式はツールバーから。書き終えたら「AI用にコピー」'),
      content: state.file.content,
      autofocus: 'end',
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

  const { render, copy } = useCopyForAI(editor, state.file.title);
  const [toast, setToast] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState({ text: '', formatLabel: '' });
  const [linkOpen, setLinkOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
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
    editor?.commands.focus();
  }, [editor]);

  const recordRevision = useCallback(() => {
    const rev = session.addRevision('manual');
    setToast(rev ? '今の状態を履歴に記録しました' : '記録できませんでした');
  }, [session]);

  const handleCopy = useCallback(async () => {
    const result = await copy();
    if (result.empty) setToast('コピーする内容がありません');
    else if (result.ok) {
      // 「AIに渡した時点」を履歴として残す
      if (settings.revisionOnCopy) session.addRevision('copy');
      setToast(`AI用にコピーしました（${result.formatLabel}・${result.length.toLocaleString()} 文字）`);
    } else setToast('コピーできませんでした。ブラウザの権限を確認してください');
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
      editor.chain().setContent(revision.content, { emitUpdate: true }).focus('start').run();
      setHistoryOpen(false);
      setToast(`${formatShort(revision.createdAt)} の版に戻しました`);
    },
    [editor, session],
  );

  const copyRevision = useCallback(
    async (revision: Revision) => {
      const { exporter, text } = exportDoc(revision.content, settings.copyFormat, { title: revision.title });
      try {
        await copyText(text);
        setToast(`この版をコピーしました（${exporter.label}・${text.length.toLocaleString()} 文字）`);
      } catch {
        setToast('コピーできませんでした');
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
        setToast(
          result.downloaded
            ? `「${result.fileName}」をダウンロードしました`
            : `「${result.fileName}」に保存しました`,
        );
      } catch (e) {
        console.error(e);
        setToast('保存できませんでした');
      }
    },
    [session],
  );

  const runPending = useCallback(
    async (action: PendingAction) => {
      if (action.kind === 'new') {
        session.newDocument();
        setToast('新しい文書を作成しました');
        return;
      }
      try {
        const opened = action.opened ?? (await openFileWithPicker());
        if (!opened) return;
        session.openDocument(opened);
        setToast(`「${opened.fileName}」を開きました`);
      } catch (e) {
        console.error(e);
        setToast(e instanceof FileFormatError ? e.message : 'ファイルを開けませんでした');
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
        setToast(err instanceof FileFormatError ? err.message : 'ファイルを開けませんでした');
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop, true);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop, true);
    };
  }, [guarded]);

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
  const closeMenuAnd = (fn: () => void) => () => {
    setMenuAnchor(null);
    fn();
  };
  const saveStatus = !state.fileName ? 'まだ保存していません' : state.dirty ? '未保存の変更あり' : '保存済み';

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" sx={(t) => ({ borderBottom: `1px solid ${t.m3.outlineVariant}` })}>
        {/* 1 段目: ロゴ・文書タイトル・設定・ヘルプ */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, px: { xs: 1.5, sm: 2 }, pt: 1.25, pb: 0.5, maxWidth: HEADER_WIDTH, width: '100%', mx: 'auto' }}>
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
          <Tooltip title={`AI用にコピー（${mod}+Shift+Enter）`}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, flexShrink: 0 }}
            >
              AI用にコピー
            </Button>
          </Tooltip>
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
            <ActionButton icon={<FolderOpenOutlinedIcon />} label="開く" tooltip={`開く（${mod}+O）`} onClick={() => guarded({ kind: 'open' })} />
            <ActionButton
              icon={<SaveOutlinedIcon />}
              label="保存"
              accent={state.dirty}
              tooltip={state.fileName ? `「${state.fileName}」に保存（${mod}+S）` : `保存（${mod}+S）`}
              onClick={() => void handleSave()}
            />
            <ActionDivider />
            <ActionButton icon={<UndoIcon />} label="戻す" tooltip={`元に戻す（${mod}+Z）`} disabled={!history?.canUndo} onClick={() => editor?.chain().focus().undo().run()} />
            <ActionButton icon={<RedoIcon />} label="進む" tooltip={`やり直す（${mod}+Shift+Z）`} disabled={!history?.canRedo} onClick={() => editor?.chain().focus().redo().run()} />
            <ActionDivider />
            <ActionButton icon={<SearchIcon />} label="検索" tooltip={`検索・置換（${mod}+F）`} active={searchOpen} onClick={() => (searchOpen ? closeSearch() : openSearch(false))} />
            <ActionButton icon={<HistoryIcon />} label="履歴" tooltip="履歴（過去の版）" onClick={() => setHistoryOpen(true)} />
            <ActionButton icon={<VisibilityOutlinedIcon />} label="プレビュー" tooltip="コピー内容をプレビュー" onClick={openPreview} />
            <ActionButton icon={<NoteAddOutlinedIcon />} label="新規" tooltip="新しい文書" hideOnMobile onClick={() => guarded({ kind: 'new' })} />
            <ActionButton icon={<MoreHorizIcon />} label="その他" onClick={(e) => setMenuAnchor(e.currentTarget)} />
          </ActionBar>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { minWidth: 240 } } }}
          >
            <MenuEntry icon={<NoteAddOutlinedIcon fontSize="small" />} label="新規作成" onClick={closeMenuAnd(() => guarded({ kind: 'new' }))} />
            <MenuEntry icon={<SaveAsOutlinedIcon fontSize="small" />} label="名前を付けて保存…" onClick={closeMenuAnd(() => void handleSave(true))} />
            <MenuEntry icon={<FindReplaceIcon fontSize="small" />} label="置換" shortcut={`${mod}+H`} onClick={closeMenuAnd(() => openSearch(true))} />
            <MenuEntry icon={<BookmarkAddOutlinedIcon fontSize="small" />} label="今の状態を履歴に記録" onClick={closeMenuAnd(recordRevision)} />
          </Menu>
        </Box>

        {editor && (
          <>
            <Divider />
            <Box sx={{ maxWidth: HEADER_WIDTH, width: '100%', mx: 'auto' }}>
              <Toolbar editor={editor} onLinkClick={() => setLinkOpen(true)} />
            </Box>
            <Box sx={{ maxWidth: HEADER_WIDTH, width: '100%', mx: 'auto' }}>
              <TableQuickBar editor={editor} />
            </Box>
            {searchOpen && (
              <SearchBar
                editor={editor}
                replaceOpen={replaceOpen}
                onToggleReplace={() => setReplaceOpen((v) => !v)}
                onClose={closeSearch}
                onReplacedAll={(n) => setToast(`${n} 件を置換しました`)}
                focusKey={searchFocusKey}
              />
            )}
          </>
        )}
      </AppBar>

      <Box
        component="main"
        sx={{ flex: 1, width: '100%', maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, pt: { xs: 2, sm: 3 }, pb: 16 }}
        onClick={(e) => {
          // 余白クリックでも入力を始められるようにする
          if (e.target === e.currentTarget) editor?.commands.focus('end');
        }}
      >
        <Box sx={editorContentSx(settings.fontSize)}>
          <EditorContent editor={editor} />
        </Box>
      </Box>

      <Box
        component="footer"
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
          height: 'calc(32px + env(safe-area-inset-bottom))',
          pb: 'env(safe-area-inset-bottom)',
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
      </Box>

      <Fab
        variant="extended"
        color="primary"
        aria-label="AI用にコピー"
        onClick={handleCopy}
        sx={{
          display: { xs: 'inline-flex', sm: 'none' },
          position: 'fixed',
          right: 16,
          bottom: 'calc(48px + env(safe-area-inset-bottom))',
          gap: 1,
          zIndex: 3,
        }}
      >
        <ContentCopyIcon />
        AI用にコピー
      </Fab>

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
          setToast('履歴を削除しました');
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
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 'calc(112px + env(safe-area-inset-bottom))', sm: 48 } }}
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

interface MenuEntryProps {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}

function MenuEntry({ icon, label, shortcut, onClick }: MenuEntryProps) {
  return (
    <MenuItem onClick={onClick}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText>{label}</ListItemText>
      {shortcut && (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          {shortcut}
        </Typography>
      )}
    </MenuItem>
  );
}
