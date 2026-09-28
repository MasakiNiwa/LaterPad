import { useMemo, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import HistoryIcon from '@mui/icons-material/History';
import type { DocNode } from '../../core/document';
import { plainTextOf } from '../../core/document';
import { diffText } from '../../core/diff';
import { exportDoc } from '../../core/export';
import type { LaterPadFile, Revision, RevisionReason } from '../../core/file/format';
import {
  headRevision,
  layoutRevisionGraph,
  parentRevision,
  REVISION_REASON_LABELS,
  revisionLength,
} from '../../core/revisions';
import { formatDateTime, formatRelative } from '../../lib/time';
import { DiffView, TextView } from './DiffView';
import { RevisionGraphCell } from './RevisionGraph';

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
  onRename: (revision: Revision, note: string) => void;
  onClearAll: () => void;
}

type ViewMode = 'content' | 'parent' | 'current';
type Filter = 'all' | 'named' | 'copy';

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
            width: { xs: '100%', sm: 460 },
            bgcolor: t.m3.surface,
            borderTopLeftRadius: { sm: 16 },
            borderBottomLeftRadius: { sm: 16 },
          }),
        },
      }}
    >
      {selected ? (
        <RevisionDetail key={selected.id} {...props} revision={selected} onBack={() => setSelectedId(null)} />
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

/** 版の見出し: 名前があれば名前、なければ記録のきっかけ */
function revisionTitle(r: Revision): string {
  return r.note || REVISION_REASON_LABELS[r.reason] || '記録';
}

function RevisionList({ file, onClose, onRecord, onSelect, onClearAll }: HistoryDrawerProps & { onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const head = headRevision(file);
  const { rows, laneCount } = useMemo(() => layoutRevisionGraph(file.revisions), [file.revisions]);
  const lengths = useMemo(() => new Map(file.revisions.map((r) => [r.id, revisionLength(r)])), [file.revisions]);
  const branched = laneCount > 1;

  const visible = rows.filter((row) =>
    filter === 'named' ? !!row.revision.note : filter === 'copy' ? row.revision.reason === 'copy' : true,
  );
  // 絞り込み中は枝の線がつながらないため、線を出さずに一覧だけにする
  const showGraph = filter === 'all';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header
        title="履歴"
        onClose={onClose}
        action={
          file.revisions.length > 0 ? (
            <Tooltip title="すべての履歴を削除">
              <IconButton aria-label="すべての履歴を削除" onClick={() => setConfirmClear(true)}>
                <DeleteSweepOutlinedIcon />
              </IconButton>
            </Tooltip>
          ) : undefined
        }
      />
      {confirmClear && (
        <Box sx={(t) => ({ mx: 2, mb: 1, p: 1.5, borderRadius: '12px', bgcolor: t.m3.surfaceContainerHigh })}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {file.revisions.length} 件の履歴をすべて削除しますか？本文は変わりません。削除した履歴は元に戻せません。
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => setConfirmClear(false)}>
              キャンセル
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              disableElevation
              onClick={() => {
                setConfirmClear(false);
                onClearAll();
              }}
            >
              すべて削除
            </Button>
          </Box>
        </Box>
      )}
      <Box sx={{ px: 2, pb: 1 }}>
        <Button variant="outlined" fullWidth startIcon={<BookmarkAddOutlinedIcon />} onClick={onRecord}>
          今の状態を記録
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, px: 0.5 }}>
          AI用にコピーした時と、過去の版に戻す前に自動で記録されます。過去の版に戻してから編集すると、そこから枝分かれします。
        </Typography>
        {file.revisions.length > 0 && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={filter}
            onChange={(_, v: Filter | null) => v && setFilter(v)}
            sx={{ mt: 1.5 }}
            aria-label="絞り込み"
          >
            <ToggleButton value="all">すべて {file.revisions.length}</ToggleButton>
            <ToggleButton value="named">名前付き</ToggleButton>
            <ToggleButton value="copy">AI用コピー</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
      {file.revisions.length === 0 ? (
        <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 6, px: 3 }}>
          <HistoryIcon sx={{ fontSize: 48, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            まだ履歴はありません
          </Typography>
        </Box>
      ) : visible.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {filter === 'named' ? '名前の付いた版はありません。版を開いて名前を付けられます。' : '該当する版はありません'}
        </Typography>
      ) : (
        <Box role="list" sx={{ px: 1, pb: 2, overflowY: 'auto', flex: 1 }}>
          {visible.map((row) => {
            const r = row.revision;
            const Icon = REASON_ICONS[r.reason] ?? BookmarkBorderIcon;
            const text = plainTextOf(r.content).replace(/\s+/g, ' ').trim();
            const parentLen = r.parentId ? lengths.get(r.parentId) : undefined;
            const delta = parentLen === undefined ? null : (lengths.get(r.id) ?? 0) - parentLen;
            const isHead = head?.id === r.id;
            return (
              <ButtonBase
                key={r.id}
                role="listitem"
                onClick={() => onSelect(r.id)}
                sx={(t) => ({
                  display: 'flex',
                  alignItems: 'stretch',
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: '12px',
                  gap: 1.25,
                  px: 1,
                  bgcolor: isHead ? t.m3.surfaceContainerLow : 'transparent',
                  '&:hover': { bgcolor: t.palette.action.hover },
                })}
              >
                {showGraph && (branched || file.revisions.length > 1) && (
                  <Box sx={{ display: 'flex', alignSelf: 'stretch' }}>
                    <RevisionGraphCell row={row} laneCount={laneCount} isHead={isHead} />
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0, py: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Icon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                    <Typography noWrap sx={{ flex: 1, minWidth: 0, fontWeight: r.note ? 700 : 500, fontSize: 15 }}>
                      {revisionTitle(r)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }} title={formatDateTime(r.createdAt)}>
                      {formatRelative(r.createdAt)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                    {text ? text.slice(0, 80) : '（空の文書）'}
                  </Typography>
                  {(isHead || row.childCount > 1 || delta) && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      {isHead && <Chip size="small" color="primary" label="いまの元" sx={{ height: 20, fontSize: 11 }} />}
                      {row.childCount > 1 && (
                        <Chip size="small" icon={<CallSplitIcon sx={{ fontSize: 14 }} />} label={`${row.childCount} つに分岐`} sx={{ height: 20, fontSize: 11 }} />
                      )}
                      {delta !== null && delta !== 0 && (
                        <Typography variant="caption" sx={{ color: delta > 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                          {delta > 0 ? `+${delta}` : `−${-delta}`} 字
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Box>
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
  onRename,
}: HistoryDrawerProps & { revision: Revision; onBack: () => void }) {
  const [mode, setMode] = useState<ViewMode>('current');
  const parent = parentRevision(file, revision.id);
  const isHead = headRevision(file)?.id === revision.id;
  // 名前は入力中は手元だけで持ち、確定時に反映する（日本語入力の変換を妨げないため）
  const [name, setName] = useState(revision.note ?? '');
  const commitName = () => {
    if (name.trim() !== (revision.note ?? '')) onRename(revision, name);
  };

  const body = useMemo(() => {
    const render = (doc: DocNode, title?: string) => exportDoc(doc, exporterId, { title }).text;
    const text = render(revision.content, revision.title);
    if (mode === 'content') return <TextView text={text} />;
    if (mode === 'parent') {
      if (!parent) {
        return (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            これが最初の版です
          </Typography>
        );
      }
      return <DiffView diff={diffText(render(parent.content, parent.title), text)} />;
    }
    return <DiffView diff={diffText(text, render(getCurrentContent(), file.title))} />;
  }, [mode, revision, parent, exporterId, getCurrentContent, file.title]);

  const modeHelp: Record<ViewMode, string> = {
    content: 'この時点の内容（AI用コピーの形式）',
    parent: 'この版の元になった版からの変更点',
    current: 'この時点から現在までの変更点',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header
        title={revisionTitle(revision)}
        onBack={onBack}
        onClose={onClose}
        action={
          <Tooltip title="この履歴を削除">
            <IconButton aria-label="この履歴を削除" onClick={() => onDelete(revision)}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <Box sx={{ px: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {formatDateTime(revision.createdAt)}・{REVISION_REASON_LABELS[revision.reason] ?? '記録'}
          {revision.title ? `・${revision.title}` : ''}
          {isHead ? '・いまの元' : ''}
        </Typography>
        <InputBase
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="この版に名前を付ける（例：完成版、A案）"
          startAdornment={<LabelOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
          inputProps={{ 'aria-label': 'この版の名前', maxLength: 60 }}
          fullWidth
          sx={(t) => ({ mt: 1, px: 1.5, height: 40, borderRadius: '20px', bgcolor: t.m3.surfaceContainerHigh, fontSize: 16 })}
        />
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={mode}
          onChange={(_, v: ViewMode | null) => v && setMode(v)}
          sx={{ mt: 1.5 }}
        >
          <ToggleButton value="current">現在と比較</ToggleButton>
          <ToggleButton value="parent">元の版と比較</ToggleButton>
          <ToggleButton value="content">内容</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {modeHelp[mode]}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>{body}</Box>
      <Box
        sx={(t) => ({
          p: 2,
          pb: 'calc(16px + env(safe-area-inset-bottom))',
          borderTop: `1px solid ${t.m3.outlineVariant}`,
        })}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button fullWidth variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => onCopy(revision)}>
            この版をコピー
          </Button>
          <Button fullWidth variant="contained" disableElevation startIcon={<RestoreIcon />} onClick={() => onRestore(revision)}>
            この版に戻す
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
