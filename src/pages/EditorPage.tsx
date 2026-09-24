import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
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
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import { Brand } from '../components/Brand';
import { PreviewDialog } from '../components/PreviewDialog';
import { createEmptyDoc, plainTextOf, type DocNode } from '../core/document';
import { loadDraft, saveDraft } from '../core/storage/draft';
import { createExtensions } from '../editor/extensions';
import { editorContentSx } from '../editor/editorStyles';
import { LinkDialog } from '../editor/LinkDialog';
import { Toolbar } from '../editor/Toolbar';
import { useCopyForAI } from '../editor/useCopyForAI';
import { modKey } from '../lib/platform';
import { useSettings } from '../settings/SettingsContext';

const DRAFT_SAVE_DELAY = 400;

export function EditorPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const saveTimer = useRef<number | undefined>(undefined);

  const initialContent = useMemo(() => loadDraft()?.content ?? createEmptyDoc(), []);

  const editor = useEditor({
    extensions: createExtensions('ここに文章を書く… 書式はツールバーから。書き終えたら「AI用にコピー」'),
    content: initialContent,
    autofocus: 'end',
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { 'aria-label': '本文', spellcheck: 'false' },
    },
    onUpdate: ({ editor: e }) => {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => saveDraft(e.getJSON() as DocNode), DRAFT_SAVE_DELAY);
    },
  });

  // ページ離脱時に保留中の下書きを確実に保存する
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current !== undefined && editor) {
        window.clearTimeout(saveTimer.current);
        saveDraft(editor.getJSON() as DocNode);
      }
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [editor]);

  const charCount = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? plainTextOf(e.getJSON() as DocNode).replace(/\n/g, '').length : 0),
  });

  const { render, copy } = useCopyForAI(editor);
  const [toast, setToast] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState({ text: '', formatLabel: '' });
  const [linkOpen, setLinkOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const handleCopy = useCallback(async () => {
    const result = await copy();
    if (result.empty) setToast('コピーする内容がありません');
    else if (result.ok)
      setToast(`AI用にコピーしました（${result.formatLabel}・${result.length.toLocaleString()} 文字）`);
    else setToast('コピーできませんでした。ブラウザの権限を確認してください');
  }, [copy]);

  const openPreview = useCallback(() => {
    const { exporter, text } = render();
    setPreview({ text, formatLabel: exporter.label });
    setPreviewOpen(true);
  }, [render]);

  // アプリ全体のショートカット
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        void handleCopy();
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'k' && editor?.isFocused) {
        e.preventDefault();
        setLinkOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCopy, editor]);

  const copyShortcut = `${modKey()}+Shift+Enter`;

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" sx={(t) => ({ borderBottom: `1px solid ${t.m3.outlineVariant}` })}>
        <MuiToolbar sx={{ gap: 1 }}>
          <Brand />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="コピー内容をプレビュー">
            <IconButton aria-label="コピー内容をプレビュー" onClick={openPreview}>
              <VisibilityOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={`AI用にコピー（${copyShortcut}）`}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
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
          >
            <MenuItem onClick={() => navigate('/settings')}>
              <ListItemIcon>
                <SettingsOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>設定</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => navigate('/help')}>
              <ListItemIcon>
                <HelpOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>ヘルプ</ListItemText>
            </MenuItem>
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
        sx={{ flex: 1, width: '100%', maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, pt: { xs: 2, sm: 4 }, pb: 14 }}
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
        <Typography variant="caption">{(charCount ?? 0).toLocaleString()} 文字</Typography>
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
