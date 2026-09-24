import { useMemo, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import HistoryIcon from '@mui/icons-material/History';
import type { DocNode } from '../../core/document';
import { plainTextOf } from '../../core/document';
import { diffText } from '../../core/diff';
import { exportDoc } from '../../core/export';
import type { LaterPadFile, Revision, RevisionReason } from '../../core/file/format';
import { previousRevision, REVISION_REASON_LABELS } from '../../core/revisions';
import { formatDateTime, formatRelative } from '../../lib/time';
import { DiffView, TextView } from './DiffView';

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  file: LaterPadFile;
  exporterId: string;
  getCurrentContent: () => DocNode;
  onRecord: () => void;
  onRestore: (revision: Revision) => void;
  onCopy: (revision: Revision) => void;
  onDelete: (revision: Revision) => void;
}

type ViewMode = 'content' | 'previous' | 'current';

const REASON_ICONS: Record<RevisionReason, typeof ContentCopyIcon> = {
  copy: ContentCopyIcon,
  save: SaveOutlinedIcon,
  manual: BookmarkBorderIcon,
  restore: RestoreIcon,
};

export function HistoryDrawer(props: HistoryDrawerProps) {
  const { open, onClose, file } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 開き直したときは一覧から始める
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelectedId(null);
  }
  const selected = file.revisions.find((r) => r.id === selectedId) ?? null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: (t) => ({
            width: { xs: '100%', sm: 440 },
            bgcolor: t.m3.surface,
            borderTopLeftRadius: { sm: 16 },
            borderBottomLeftRadius: { sm: 16 },
          }),
        },
      }}
    >
      {selected ? (
        <RevisionDetail {...props} revision={selected} onBack={() => setSelectedId(null)} />
      ) : (
        <RevisionList {...props} onSelect={setSelectedId} />
      )}
    </Drawer>
  );
}

function Header({ title, onBack, onClose, action }: { title: string; onBack?: () => void; onClose: () => void; action?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1, minHeight: 64 }}>
      {onBack && (
        <IconButton aria-label="一覧に戻る" onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
      )}
      <Typography variant="h6" component="h2" sx={{ flex: 1, fontWeight: 600, pl: onBack ? 0 : 1.5 }} noWrap>
        {title}
      </Typography>
      {action}
      <IconButton aria-label="閉じる" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </Box>
  );
}

function RevisionList({ file, onClose, onRecord, onSelect }: HistoryDrawerProps & { onSelect: (id: string) => void }) {
  const revisions = [...file.revisions].reverse();
  return (
    <>
      <Header title="履歴" onClose={onClose} />
      <Box sx={{ px: 2, pb: 1 }}>
        <Button variant="outlined" fullWidth startIcon={<BookmarkAddOutlinedIcon />} onClick={onRecord}>
          今の状態を記録
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, px: 0.5 }}>
          AI用にコピーした時・ファイルに保存した時・復元する前に自動で記録されます。
        </Typography>
      </Box>
      {revisions.length === 0 ? (
        <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 6, px: 3 }}>
          <HistoryIcon sx={{ fontSize: 48, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            まだ履歴はありません
          </Typography>
        </Box>
      ) : (
        <List sx={{ px: 1, overflowY: 'auto' }}>
          {revisions.map((r) => {
            const Icon = REASON_ICONS[r.reason] ?? BookmarkBorderIcon;
            const text = plainTextOf(r.content).replace(/\s+/g, ' ').trim();
            return (
              <ListItemButton key={r.id} onClick={() => onSelect(r.id)} sx={{ borderRadius: '12px', alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <span>{REVISION_REASON_LABELS[r.reason] ?? r.reason}</span>
                      <Typography component="span" variant="caption" color="text.secondary" title={formatDateTime(r.createdAt)}>
                        {formatRelative(r.createdAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={text ? text.slice(0, 80) : '（空の文書）'}
                  slotProps={{ secondary: { noWrap: true } }}
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </>
  );
}

function RevisionDetail({
  file,
  revision,
  exporterId,
  getCurrentContent,
  onClose,
  onBack,
  onRestore,
  onCopy,
  onDelete,
}: HistoryDrawerProps & { revision: Revision; onBack: () => void }) {
  const [mode, setMode] = useState<ViewMode>('current');
  const prev = previousRevision(file, revision.id);

  const body = useMemo(() => {
    const render = (doc: DocNode, title?: string) => exportDoc(doc, exporterId, { title }).text;
    const text = render(revision.content, revision.title);
    if (mode === 'content') return <TextView text={text} />;
    if (mode === 'previous') {
      if (!prev) {
        return (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            これが最も古い履歴です
          </Typography>
        );
      }
      return <DiffView diff={diffText(render(prev.content, prev.title), text)} />;
    }
    return <DiffView diff={diffText(text, render(getCurrentContent(), file.title))} />;
  }, [mode, revision, prev, exporterId, getCurrentContent, file.title]);

  const modeHelp: Record<ViewMode, string> = {
    content: 'この時点の内容（AI用コピーの形式）',
    previous: 'ひとつ前の履歴からの変更点',
    current: 'この時点から現在までの変更点',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header
        title={REVISION_REASON_LABELS[revision.reason] ?? '履歴'}
        onBack={onBack}
        onClose={onClose}
        action={
          <Tooltip title="この履歴を削除">
            <IconButton
              aria-label="この履歴を削除"
              // 削除されると selected が見つからなくなり、自動的に一覧表示に戻る
              onClick={() => onDelete(revision)}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <Box sx={{ px: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {formatDateTime(revision.createdAt)}
          {revision.title ? `・${revision.title}` : ''}
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={mode}
          onChange={(_, v: ViewMode | null) => v && setMode(v)}
          sx={{ mt: 1.5 }}
        >
          <ToggleButton value="current">現在と比較</ToggleButton>
          <ToggleButton value="previous">前の版と比較</ToggleButton>
          <ToggleButton value="content">内容</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {modeHelp[mode]}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>{body}</Box>
      <Box
        sx={(t) => ({
          display: 'flex',
          gap: 1,
          p: 2,
          pb: 'calc(16px + env(safe-area-inset-bottom))',
          borderTop: `1px solid ${t.m3.outlineVariant}`,
        })}
      >
        <Button fullWidth variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => onCopy(revision)}>
          この版をコピー
        </Button>
        <Button fullWidth variant="contained" disableElevation startIcon={<RestoreIcon />} onClick={() => onRestore(revision)}>
          この版に戻す
        </Button>
      </Box>
    </Box>
  );
}
