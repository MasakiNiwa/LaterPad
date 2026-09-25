import type { ReactNode } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import BorderBottomIcon from '@mui/icons-material/BorderBottom';
import BorderRightIcon from '@mui/icons-material/BorderRight';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import LayersClearOutlinedIcon from '@mui/icons-material/LayersClearOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { AI_BLOCK_NODE, roleInfo } from '../core/aiBlocks';
import { useSettings } from '../settings/SettingsContext';

interface Action {
  label: string;
  icon: ReactNode;
  run: () => void;
  disabled?: boolean;
  danger?: boolean;
}

/**
 * カーソルのある場所に応じて、よく使う操作だけを一列に出す「その場の操作」バー。
 * 表の中なら行・列の追加と削除、リストの中なら改行や字下げ、意味ブロックの中なら移動や削除。
 * すべての機能はこれまでどおりツールバーのメニューにある。
 */
export function ContextBar({ editor }: { editor: Editor }) {
  const { settings } = useSettings();
  const ctx = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { $from } = e.state.selection;
      let blockPos: number | null = null;
      let blockRole = '';
      for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === AI_BLOCK_NODE) {
          blockPos = $from.before(d);
          blockRole = String($from.node(d).attrs.role);
          break;
        }
      }
      const listType = e.isActive('taskItem') ? 'taskItem' : e.isActive('listItem') ? 'listItem' : null;
      return {
        table: e.isActive('table'),
        listType,
        taskList: e.isActive('taskList'),
        canSink: listType ? e.can().sinkListItem(listType) : false,
        canLift: listType ? e.can().liftListItem(listType) : false,
        blockPos,
        blockRole,
        canUp: blockPos !== null && !!e.state.doc.resolve(blockPos).parent.maybeChild(e.state.doc.resolve(blockPos).index() - 1),
        canDown: blockPos !== null && !!e.state.doc.resolve(blockPos).parent.maybeChild(e.state.doc.resolve(blockPos).index() + 1),
      };
    },
  });
  if (!ctx) return null;
  const chain = () => editor.chain().focus();

  const sections: { key: string; icon: ReactNode; label: string; actions: Action[] }[] = [];
  if (ctx.table) {
    sections.push({
      key: 'table',
      icon: <TableChartOutlinedIcon fontSize="small" />,
      label: '表',
      actions: [
        { label: '行を足す', icon: <BorderBottomIcon />, run: () => chain().addRowAfter().run() },
        { label: '列を足す', icon: <BorderRightIcon />, run: () => chain().addColumnAfter().run() },
        { label: '行を削除', icon: <TableRowsOutlinedIcon />, run: () => chain().deleteRow().run() },
        { label: '列を削除', icon: <ViewColumnOutlinedIcon />, run: () => chain().deleteColumn().run() },
      ],
    });
  }
  if (ctx.listType) {
    const type = ctx.listType;
    sections.push({
      key: 'list',
      icon: <FormatListBulletedIcon fontSize="small" />,
      label: 'リスト',
      actions: [
        { label: '項目内で改行', icon: <KeyboardReturnIcon />, run: () => chain().setHardBreak().run() },
        { label: '字下げ', icon: <FormatIndentIncreaseIcon />, disabled: !ctx.canSink, run: () => chain().sinkListItem(type).run() },
        { label: '戻す', icon: <FormatIndentDecreaseIcon />, disabled: !ctx.canLift, run: () => chain().liftListItem(type).run() },
        ctx.taskList
          ? { label: '箇条書きに', icon: <FormatListBulletedIcon />, run: () => chain().toggleBulletList().run() }
          : { label: 'チェックリストに', icon: <ChecklistIcon />, run: () => chain().toggleTaskList().run() },
      ],
    });
  }
  if (ctx.blockPos !== null) {
    const pos = ctx.blockPos;
    sections.push({
      key: 'block',
      icon: <AutoAwesomeOutlinedIcon fontSize="small" />,
      label: roleInfo(ctx.blockRole).label,
      actions: [
        { label: '上へ', icon: <ArrowUpwardIcon />, disabled: !ctx.canUp, run: () => chain().moveAiBlockAt(pos, -1).run() },
        { label: '下へ', icon: <ArrowDownwardIcon />, disabled: !ctx.canDown, run: () => chain().moveAiBlockAt(pos, 1).run() },
        { label: '解除', icon: <LayersClearOutlinedIcon />, run: () => chain().unsetAiBlock().run() },
        { label: '削除', icon: <DeleteOutlineOutlinedIcon />, danger: true, run: () => chain().deleteAiBlockAt(pos).run() },
      ],
    });
  }
  if (sections.length === 0) return null;
  const compact = settings.iconOnly;

  return (
    <Box
      role="toolbar"
      aria-label="その場の操作"
      sx={(t) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: { xs: 1.5, sm: 2 },
        py: 0.75,
        bgcolor: t.m3.primaryContainer,
        borderRadius: { xs: 0, sm: '12px' },
        mx: { xs: 0, sm: 1 },
        mb: { xs: 0, sm: 0.75 },
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        '& > *': { flexShrink: 0 },
      })}
    >
      {sections.map((sec, i) => (
        <Box key={sec.key} sx={{ display: 'contents' }}>
          {i > 0 && <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5, borderColor: 'rgba(0,0,0,0.15)' }} />}
          <Box sx={(t) => ({ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: t.m3.onPrimaryContainer, mr: 0.25 })} title={sec.label}>
            {sec.icon}
            {!compact && <Box component="span" sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{sec.label}</Box>}
          </Box>
          {sec.actions.map((a) => (
            <Chip
              key={a.label}
              icon={<Box component="span" sx={{ display: 'inline-flex', '& svg': { fontSize: 18 } }}>{a.icon}</Box>}
              label={compact ? undefined : a.label}
              aria-label={a.label}
              title={a.label}
              disabled={a.disabled}
              onClick={a.run}
              onMouseDown={(e) => e.preventDefault()}
              sx={(t) => ({
                bgcolor: t.m3.surface,
                color: a.danger ? t.palette.error.main : t.m3.onSurface,
                borderRadius: '10px',
                fontWeight: 500,
                '& .MuiChip-icon': { color: 'inherit', ml: compact ? '4px' : '6px', mr: compact ? '-8px' : '-2px' },
                '& .MuiChip-label': { px: compact ? 1 : 1.25 },
              })}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
