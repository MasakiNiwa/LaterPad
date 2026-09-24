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
import MuiToolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SaveAsOutlinedIcon from '@mui/icons-material/SaveAsOutlined';
import HistoryIcon from '@mui/icons-material/History';
import { Brand } from '../components/Brand';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PreviewDialog } from '../components/PreviewDialog';
import { HistoryDrawer } from '../components/history/HistoryDrawer';
import { plainTextOf, type DocNode } from '../core/document';
import { openFileWithPicker, readFile, type OpenedFile } from '../core/file/fileAccess';
import { FileFormatError, type Revision } from '../core/file/format';
import { exportDoc } from '../core/export';
import { copyText } from '../lib/clipboard';
import { createExtensions } from '../editor/extensions';
import { editorContentSx } from '../editor/editorStyles';
import { LinkDialog } from '../editor/LinkDialog';
import { Toolbar } from '../editor/Toolbar';
import { useCopyForAI } from '../editor/useCopyForAI';
import { useDocumentSession } from '../editor/useDocumentSession';
import { modKey } from '../lib/platform';
import { useSettings } from '../settings/SettingsContext';

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

  const charCount = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? plainTextOf(e.getJSON() as DocNode).replace(/\n/g, '').length : 0),
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
      } else if (!e.shiftKey && key === 'k' && editor?.isFocused) {
        e.preventDefault();
        setLinkOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCopy, handleSave, guarded, editor]);

  const mod = modKey();
  const closeMenuAnd = (fn: () => void) => () => {
    setMenuAnchor(null);
    fn();
  };
  const saveStatus = state.dirty ? '未保存' : state.fileName ? '保存済み' : '';

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" sx={(t) => ({ borderBottom: `1px solid ${t.m3.outlineVariant}` })}>
        <MuiToolbar sx={{ gap: 1 }}>
          <Brand hideTextOnMobile />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {state.fileName && (
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                title={state.fileName}
                sx={{ px: 1, display: { xs: 'none', md: 'block' } }}
              >
                {state.fileName}
                {state.dirty && ' ●'}
              </Typography>
            )}
          </Box>
          <Tooltip title={`保存（${mod}+S）`}>
            <IconButton aria-label="保存" onClick={() => void handleSave()}>
              <SaveOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="履歴">
            <IconButton aria-label="履歴" onClick={() => setHistoryOpen(true)}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="コピー内容をプレビュー">
            <IconButton aria-label="コピー内容をプレビュー" onClick={openPreview}>
              <VisibilityOutlinedIcon />
            </IconButton>
          </Tooltip>
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
          <IconButton aria-label="メニュー" edge="end" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { minWidth: 220 } } }}
          >
            <MenuEntry icon={<NoteAddOutlinedIcon fontSize="small" />} label="新規作成" onClick={closeMenuAnd(() => guarded({ kind: 'new' }))} />
            <MenuEntry icon={<FolderOpenOutlinedIcon fontSize="small" />} label="開く…" shortcut={`${mod}+O`} onClick={closeMenuAnd(() => guarded({ kind: 'open' }))} />
            <MenuEntry icon={<SaveOutlinedIcon fontSize="small" />} label="保存" shortcut={`${mod}+S`} onClick={closeMenuAnd(() => void handleSave())} />
            <MenuEntry icon={<SaveAsOutlinedIcon fontSize="small" />} label="名前を付けて保存…" onClick={closeMenuAnd(() => void handleSave(true))} />
            <Divider />
            <MenuEntry icon={<SettingsOutlinedIcon fontSize="small" />} label="設定" onClick={closeMenuAnd(() => navigate('/settings'))} />
            <MenuEntry icon={<HelpOutlineOutlinedIcon fontSize="small" />} label="ヘルプ" onClick={closeMenuAnd(() => navigate('/help'))} />
          </Menu>
        </MuiToolbar>
        {editor && (
          <>
            <Divider />
            <Box sx={{ maxWidth: 900, width: '100%', mx: 'auto' }}>
              <Toolbar editor={editor} onLinkClick={() => setLinkOpen(true)} />
            </Box>
          </>
        )}
      </AppBar>

      <Box
        component="main"
        sx={{ flex: 1, width: '100%', maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, pt: { xs: 2, sm: 3 }, pb: 14 }}
        onClick={(e) => {
          // 余白クリックでも入力を始められるようにする
          if (e.target === e.currentTarget) editor?.commands.focus('end');
        }}
      >
        <InputBase
          value={state.file.title}
          onChange={(e) => session.setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              editor?.commands.focus('start');
            }
          }}
          placeholder="無題の文書"
          fullWidth
          inputProps={{ 'aria-label': '文書タイトル（ファイル名に使われます）', maxLength: 200 }}
          sx={(t) => ({
            mb: 1.5,
            fontSize: { xs: 20, sm: 22 },
            fontWeight: 600,
            color: t.m3.onSurfaceVariant,
            '& input::placeholder': { color: t.m3.outline, opacity: 1 },
          })}
        />
        <Box sx={editorContentSx(settings.fontSize)}>
          <EditorContent editor={editor} />
        </Box>
      </Box>

      <Box
        component="footer"
        sx={(t) => ({
          position: 'fixed',
          left: 16,
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          px: 1.5,
          py: 0.5,
          borderRadius: 999,
          bgcolor: t.m3.surfaceContainer,
          color: t.m3.onSurfaceVariant,
          pointerEvents: 'none',
        })}
      >
        <Typography variant="caption">
          {(charCount ?? 0).toLocaleString()} 文字{saveStatus && ` · ${saveStatus}`}
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
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          gap: 1,
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
        onRecord={() => {
          const rev = session.addRevision('manual');
          setToast(rev ? '今の状態を履歴に記録しました' : '記録できませんでした');
        }}
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
        sx={{ bottom: { xs: 'calc(88px + env(safe-area-inset-bottom))', sm: 24 } }}
      />
    </Box>
  );
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
