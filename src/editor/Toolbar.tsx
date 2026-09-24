import { useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import TitleIcon from '@mui/icons-material/Title';
import NotesIcon from '@mui/icons-material/Notes';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import DataObjectIcon from '@mui/icons-material/DataObject';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import CodeIcon from '@mui/icons-material/Code';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import LinkIcon from '@mui/icons-material/Link';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import BorderTopIcon from '@mui/icons-material/BorderTop';
import BorderBottomIcon from '@mui/icons-material/BorderBottom';
import BorderLeftIcon from '@mui/icons-material/BorderLeft';
import BorderRightIcon from '@mui/icons-material/BorderRight';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import LayersClearOutlinedIcon from '@mui/icons-material/LayersClearOutlined';
import { useTheme } from '@mui/material/styles';
import ChecklistIcon from '@mui/icons-material/Checklist';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import { PRIORITY_COLORS } from './editorStyles';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import { AI_BLOCK_NODE, AI_BLOCK_ROLES, AI_TEMPLATES, roleInfo, type AiBlockRole } from '../core/aiBlocks';
import { ROLE_STYLE } from './aiBlock/roleStyle';
import { GroupMenu, type GroupEntry } from './GroupMenu';
import { TableSizePicker } from './TableSizePicker';
import { modKey } from '../lib/platform';

interface ToolbarProps {
  editor: Editor;
  onLinkClick: () => void;
}

const BLOCK_LABELS = ['本文', '見出し 1', '見出し 2', '見出し 3'] as const;

/**
 * 書式ツールバー。
 * 書式を「段落」「文字」「リスト」「挿入」「表」のグループにまとめ、グループから機能を選ぶ。
 */
export function Toolbar({ editor, onLinkClick }: ToolbarProps) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      heading: ([1, 2, 3] as const).find((level) => e.isActive('heading', { level })) ?? 0,
      blockquote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      codeLanguage: e.isActive('codeBlock') ? String(e.getAttributes('codeBlock').language ?? '') : '',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      link: e.isActive('link'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      taskList: e.isActive('taskList'),
      inListItem: e.isActive('listItem') || e.isActive('taskItem'),
      priority: e.isActive('priority') ? String(e.getAttributes('priority').level ?? 'must') : null,
      canSink: e.can().sinkListItem('listItem') || e.can().sinkListItem('taskItem'),
      canLift: e.can().liftListItem('listItem') || e.can().liftListItem('taskItem'),
      table: e.isActive('table'),
      aiRole: e.isActive(AI_BLOCK_NODE) ? String(e.getAttributes(AI_BLOCK_NODE).role ?? '') : null,
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
    }),
  });
  const [tableAnchor, setTableAnchor] = useState<HTMLElement | null>(null);
  const theme = useTheme();

  if (!s) return null;
  const chain = () => editor.chain().focus();
  const mod = modKey();

  const blockLabel = s.codeBlock ? 'コード' : s.blockquote ? '引用' : BLOCK_LABELS[s.heading];

  const roleIcon = (role: AiBlockRole) => (
    <Box component="span" sx={{ display: 'inline-flex', color: theme.palette.mode === 'dark' ? ROLE_STYLE[role].dark : ROLE_STYLE[role].light }}>
      {ROLE_STYLE[role].icon()}
    </Box>
  );
  const ai: GroupEntry[] = [
    { kind: 'header', label: 'テンプレートから始める' },
    ...AI_TEMPLATES.map((t) => ({
      label: t.label,
      description: t.description,
      icon: <DashboardCustomizeOutlinedIcon />,
      onSelect: () => chain().insertAiTemplate(t.id).run(),
    })),
    { kind: 'divider' },
    {
      kind: 'header',
      label: s.aiRole ? `「${roleInfo(s.aiRole).label}」の中に入れ子のブロックを作る` : '選択した段落をブロックにする',
    },
    ...AI_BLOCK_ROLES.map((r) => ({
      label: r.label,
      description: r.description,
      icon: roleIcon(r.role),
      onSelect: () => chain().wrapAiBlock(r.role).run(),
    })),
    { kind: 'divider' },
    { kind: 'header', label: '重要度（選択した文字、または今の行）' },
    { label: '必須', description: '必ず守ってほしい（【必須】が付きます）', icon: <PriorityHighIcon sx={{ color: PRIORITY_COLORS.must }} />, active: s.priority === 'must', onSelect: () => chain().setPriority('must').run() },
    { label: '推奨', description: 'できれば守ってほしい（【推奨】が付きます）', icon: <ThumbUpOutlinedIcon sx={{ color: PRIORITY_COLORS.should }} />, active: s.priority === 'should', onSelect: () => chain().setPriority('should').run() },
    { label: '重要度を外す', icon: <FormatClearIcon />, disabled: !s.priority, onSelect: () => chain().unsetPriority().run() },
    { kind: 'divider' },
    { label: 'ブロックを解除', description: '中の文章は残します（種類の変更はブロックのラベルから）', icon: <LayersClearOutlinedIcon />, disabled: !s.aiRole, onSelect: () => chain().unsetAiBlock().run() },
  ];
  const aiLabel = s.aiRole ? roleInfo(s.aiRole).label : 'AI書式';

  const paragraph: GroupEntry[] = [
    { label: '本文', icon: <NotesIcon />, active: !s.heading && !s.codeBlock && !s.blockquote, shortcut: `${mod}+Alt+0`, onSelect: () => chain().setParagraph().run() },
    ...([1, 2, 3] as const).map((level) => ({
      label: `見出し ${level}`,
      icon: <TitleIcon sx={{ transform: `scale(${[1.15, 1, 0.85][level - 1]})` }} />,
      active: s.heading === level,
      shortcut: `${mod}+Alt+${level}`,
      onSelect: () => chain().setHeading({ level }).run(),
    })),
    { kind: 'divider' },
    { label: '引用', icon: <FormatQuoteIcon />, active: s.blockquote, shortcut: `${mod}+Shift+B`, onSelect: () => chain().toggleBlockquote().run() },
    { label: 'コードブロック', icon: <DataObjectIcon />, active: s.codeBlock, shortcut: `${mod}+Alt+C`, onSelect: () => chain().toggleCodeBlock().run() },
  ];

  const text: GroupEntry[] = [
    { label: '太字', icon: <FormatBoldIcon />, active: s.bold, shortcut: `${mod}+B`, onSelect: () => chain().toggleBold().run() },
    { label: '斜体', icon: <FormatItalicIcon />, active: s.italic, shortcut: `${mod}+I`, onSelect: () => chain().toggleItalic().run() },
    { label: '取り消し線', icon: <StrikethroughSIcon />, active: s.strike, shortcut: `${mod}+Shift+S`, onSelect: () => chain().toggleStrike().run() },
    { label: 'インラインコード', icon: <CodeIcon />, active: s.code, shortcut: `${mod}+E`, onSelect: () => chain().toggleCode().run() },
    { kind: 'divider' },
    { label: '文字の書式をクリア', icon: <FormatClearIcon />, onSelect: () => chain().unsetAllMarks().run() },
  ];

  const list: GroupEntry[] = [
    { label: '箇条書き', icon: <FormatListBulletedIcon />, active: s.bulletList, shortcut: `${mod}+Shift+8`, onSelect: () => chain().toggleBulletList().run() },
    { label: '番号付きリスト', icon: <FormatListNumberedIcon />, active: s.orderedList, shortcut: `${mod}+Shift+7`, onSelect: () => chain().toggleOrderedList().run() },
    { label: 'チェックリスト', icon: <ChecklistIcon />, active: s.taskList, shortcut: `${mod}+Shift+9`, onSelect: () => chain().toggleTaskList().run() },
    { kind: 'divider' },
    { label: '項目内で改行', description: '新しい項目にせず、同じ項目の中で改行します', icon: <KeyboardReturnIcon />, disabled: !s.inListItem, shortcut: 'Shift+Enter', onSelect: () => chain().setHardBreak().run() },
    { label: '字下げ（入れ子にする）', icon: <FormatIndentIncreaseIcon />, disabled: !s.canSink, shortcut: 'Tab', onSelect: () => chain().sinkListItem(s.taskList ? 'taskItem' : 'listItem').run() },
    { label: '字下げを戻す', icon: <FormatIndentDecreaseIcon />, disabled: !s.canLift, shortcut: 'Shift+Tab', onSelect: () => chain().liftListItem(s.taskList ? 'taskItem' : 'listItem').run() },
  ];

  const insert: GroupEntry[] = [
    { label: s.link ? 'リンクを編集' : 'リンク', icon: <LinkIcon />, shortcut: `${mod}+K`, onSelect: onLinkClick },
    { label: '表…', icon: <TableChartOutlinedIcon />, disabled: s.table, onSelect: (el) => setTableAnchor(el) },
    { label: '区切り線', icon: <HorizontalRuleIcon />, onSelect: () => chain().setHorizontalRule().run() },
  ];

  const table: GroupEntry[] = [
    { kind: 'header', label: '行' },
    { label: '上に行を挿入', icon: <BorderTopIcon />, onSelect: () => chain().addRowBefore().run() },
    { label: '下に行を挿入', icon: <BorderBottomIcon />, onSelect: () => chain().addRowAfter().run() },
    { label: '行を削除', icon: <DeleteOutlineOutlinedIcon />, onSelect: () => chain().deleteRow().run() },
    { kind: 'header', label: '列' },
    { label: '左に列を挿入', icon: <BorderLeftIcon />, onSelect: () => chain().addColumnBefore().run() },
    { label: '右に列を挿入', icon: <BorderRightIcon />, onSelect: () => chain().addColumnAfter().run() },
    { label: '列を削除', icon: <DeleteOutlineOutlinedIcon />, onSelect: () => chain().deleteColumn().run() },
    { kind: 'header', label: 'セル・見出し' },
    { label: 'セルを結合', icon: <CallMergeIcon />, disabled: !s.canMerge, onSelect: () => chain().mergeCells().run() },
    { label: 'セルの結合を解除', icon: <CallSplitIcon />, disabled: !s.canSplit, onSelect: () => chain().splitCell().run() },
    { label: '1 行目を見出しにする／戻す', icon: <TableRowsOutlinedIcon />, onSelect: () => chain().toggleHeaderRow().run() },
    { label: '1 列目を見出しにする／戻す', icon: <ViewColumnOutlinedIcon />, onSelect: () => chain().toggleHeaderColumn().run() },
    { kind: 'divider' },
    { label: '表を削除', icon: <DeleteForeverOutlinedIcon />, danger: true, onSelect: () => chain().deleteTable().run() },
  ];

  return (
    <Box
      role="toolbar"
      aria-label="書式ツールバー"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.75,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        // スマホでは右端をフェードさせ、横にスクロールできることを示す
        maskImage: { xs: 'linear-gradient(to right, #000 calc(100% - 32px), transparent)', md: 'none' },
        pr: { xs: 4, md: 1 },
        '& > *': { flexShrink: 0 },
      }}
    >
      <GroupMenu label={aiLabel} icon={<AutoAwesomeOutlinedIcon />} entries={ai} active={!!s.aiRole} />
      <GroupMenu label={blockLabel} icon={<TitleIcon />} entries={paragraph} active={!!s.heading || s.blockquote || s.codeBlock} />
      <GroupMenu label="文字" icon={<TextFieldsIcon />} entries={text} active={s.bold || s.italic || s.strike || s.code} />
      <GroupMenu label="リスト" icon={<FormatListBulletedIcon />} entries={list} active={s.bulletList || s.orderedList || s.taskList} />
      <GroupMenu label="挿入" icon={<AddBoxOutlinedIcon />} entries={insert} active={s.link} />
      {s.table && <GroupMenu label="表" icon={<TableChartOutlinedIcon />} entries={table} highlight />}

      {s.codeBlock && (
        <Tooltip title="コードの言語（例: python, ts）。AI にコードの種類を伝えます">
          <InputBase
            value={s.codeLanguage}
            onChange={(e) =>
              editor
                .chain()
                .updateAttributes('codeBlock', { language: e.target.value.trim() || null })
                .run()
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                editor.commands.focus();
              }
            }}
            placeholder="言語"
            inputProps={{ 'aria-label': 'コードの言語', size: 8, spellCheck: false }}
            sx={(t) => ({
              mx: 0.5,
              px: 1.25,
              height: 32,
              // iOS は 16px 未満の入力欄にフォーカスすると画面を拡大するため、スマホでは 16px にする
              fontSize: { xs: 16, sm: 14 },
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              borderRadius: '8px',
              bgcolor: t.m3.surfaceContainerHigh,
            })}
          />
        </Tooltip>
      )}

      <TableSizePicker
        anchorEl={tableAnchor}
        onClose={() => setTableAnchor(null)}
        onSelect={(rows, cols) => {
          setTableAnchor(null);
          chain().insertTable({ rows, cols, withHeaderRow: true }).run();
        }}
      />
    </Box>
  );
}
