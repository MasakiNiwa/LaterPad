import { useState, type MouseEvent, type ReactNode } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CodeIcon from '@mui/icons-material/Code';
import DataObjectIcon from '@mui/icons-material/DataObject';
import LinkIcon from '@mui/icons-material/Link';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import TitleIcon from '@mui/icons-material/Title';
import { modKey } from '../lib/platform';

interface ToolbarProps {
  editor: Editor;
  onLinkClick: () => void;
}

const HEADING_OPTIONS = [
  { level: 0, label: '本文' },
  { level: 1, label: '見出し 1' },
  { level: 2, label: '見出し 2' },
  { level: 3, label: '見出し 3' },
] as const;

export function Toolbar({ editor, onLinkClick }: ToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      heading: ([1, 2, 3] as const).find((level) => e.isActive('heading', { level })) ?? 0,
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      code: e.isActive('code'),
      codeBlock: e.isActive('codeBlock'),
      codeLanguage: e.isActive('codeBlock') ? String(e.getAttributes('codeBlock').language ?? '') : '',
      link: e.isActive('link'),
      table: e.isActive('table'),
    }),
  });

  const [headingAnchor, setHeadingAnchor] = useState<HTMLElement | null>(null);
  const [tableAnchor, setTableAnchor] = useState<HTMLElement | null>(null);

  if (!state) return null;
  const chain = () => editor.chain().focus();
  const mod = modKey();

  const headingLabel = HEADING_OPTIONS.find((o) => o.level === state.heading)!.label;

  const tableActions: { label: string; run: () => void; danger?: boolean }[] = [
    { label: '下に行を追加', run: () => chain().addRowAfter().run() },
    { label: '上に行を追加', run: () => chain().addRowBefore().run() },
    { label: '右に列を追加', run: () => chain().addColumnAfter().run() },
    { label: '左に列を追加', run: () => chain().addColumnBefore().run() },
    { label: '行を削除', run: () => chain().deleteRow().run() },
    { label: '列を削除', run: () => chain().deleteColumn().run() },
    { label: '見出し行の切り替え', run: () => chain().toggleHeaderRow().run() },
    { label: '表を削除', run: () => chain().deleteTable().run(), danger: true },
  ];

  const onTableClick = (e: MouseEvent<HTMLElement>) => {
    if (state.table) {
      setTableAnchor(e.currentTarget);
    } else {
      chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  return (
    <Box
      role="toolbar"
      aria-label="書式ツールバー"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        px: 1,
        py: 0.5,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        // スマホでは右端をフェードさせ、横にスクロールできることを示す
        maskImage: { xs: 'linear-gradient(to right, #000 calc(100% - 32px), transparent)', md: 'none' },
        pr: { xs: 4, md: 1 },
        '&::-webkit-scrollbar': { display: 'none' },
        '& > *': { flexShrink: 0 },
      }}
    >
      <ToolButton title="元に戻す" shortcut={`${mod}+Z`} disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <UndoIcon />
      </ToolButton>
      <ToolButton title="やり直す" shortcut={`${mod}+Shift+Z`} disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <RedoIcon />
      </ToolButton>

      <Sep />

      <Tooltip title="段落スタイル">
        <Button
          size="small"
          color="inherit"
          startIcon={<TitleIcon />}
          endIcon={<ArrowDropDownIcon />}
          onClick={(e) => setHeadingAnchor(e.currentTarget)}
          sx={{ px: 1.25, minWidth: 0, fontWeight: 500, whiteSpace: 'nowrap' }}
        >
          {headingLabel}
        </Button>
      </Tooltip>
      <Menu anchorEl={headingAnchor} open={!!headingAnchor} onClose={() => setHeadingAnchor(null)}>
        {HEADING_OPTIONS.map((o) => (
          <MenuItem
            key={o.level}
            selected={o.level === state.heading}
            onClick={() => {
              setHeadingAnchor(null);
              if (o.level === 0) chain().setParagraph().run();
              else chain().setHeading({ level: o.level }).run();
            }}
          >
            <ListItemText
              primary={o.label}
              slotProps={{
                primary: {
                  sx: { fontWeight: o.level ? 700 : 400, fontSize: [16, 22, 19, 17][o.level] },
                },
              }}
            />
          </MenuItem>
        ))}
      </Menu>

      <Sep />

      <ToolButton title="太字" shortcut={`${mod}+B`} active={state.bold} onClick={() => chain().toggleBold().run()}>
        <FormatBoldIcon />
      </ToolButton>
      <ToolButton title="斜体" shortcut={`${mod}+I`} active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <FormatItalicIcon />
      </ToolButton>
      <ToolButton title="取り消し線" shortcut={`${mod}+Shift+S`} active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <StrikethroughSIcon />
      </ToolButton>

      <Sep />

      <ToolButton title="箇条書き" shortcut={`${mod}+Shift+8`} active={state.bulletList} onClick={() => chain().toggleBulletList().run()}>
        <FormatListBulletedIcon />
      </ToolButton>
      <ToolButton title="番号付きリスト" shortcut={`${mod}+Shift+7`} active={state.orderedList} onClick={() => chain().toggleOrderedList().run()}>
        <FormatListNumberedIcon />
      </ToolButton>
      <ToolButton title="引用" shortcut={`${mod}+Shift+B`} active={state.blockquote} onClick={() => chain().toggleBlockquote().run()}>
        <FormatQuoteIcon />
      </ToolButton>

      <Sep />

      <ToolButton title="インラインコード" shortcut={`${mod}+E`} active={state.code} onClick={() => chain().toggleCode().run()}>
        <CodeIcon />
      </ToolButton>
      <ToolButton title="コードブロック" shortcut={`${mod}+Alt+C`} active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
        <DataObjectIcon />
      </ToolButton>
      {state.codeBlock && (
        <Tooltip title="コードの言語（例: python, ts）。AI にコードの種類を伝えます">
          <InputBase
            value={state.codeLanguage}
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
      <ToolButton title="リンク" shortcut={`${mod}+K`} active={state.link} onClick={onLinkClick}>
        <LinkIcon />
      </ToolButton>
      <ToolButton title={state.table ? '表の操作' : '表を挿入'} active={state.table} onClick={onTableClick}>
        <TableChartOutlinedIcon />
      </ToolButton>
      <ToolButton title="区切り線" onClick={() => chain().setHorizontalRule().run()}>
        <HorizontalRuleIcon />
      </ToolButton>

      <Menu anchorEl={tableAnchor} open={!!tableAnchor} onClose={() => setTableAnchor(null)}>
        {tableActions.map((a) => (
          <MenuItem
            key={a.label}
            onClick={() => {
              setTableAnchor(null);
              a.run();
            }}
            sx={a.danger ? { color: 'error.main' } : undefined}
          >
            {a.label}
          </MenuItem>
        ))}
      </Menu>

    </Box>
  );
}

function Sep() {
  return <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />;
}

interface ToolButtonProps {
  title: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: (e: MouseEvent<HTMLElement>) => void;
  children: ReactNode;
}

function ToolButton({ title, shortcut, active, disabled, onClick, children }: ToolButtonProps) {
  return (
    <Tooltip title={shortcut ? `${title}（${shortcut}）` : title}>
      <span>
        <IconButton
          aria-label={title}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          // ツールバー操作でエディタのフォーカス（選択範囲）を失わないようにする
          onMouseDown={(e) => e.preventDefault()}
          sx={{
            borderRadius: '999px',
            color: active ? 'primary.main' : 'text.secondary',
            bgcolor: active ? (t) => t.m3.primaryContainer : 'transparent',
            '&:hover': { bgcolor: active ? (t) => t.m3.primaryContainer : undefined },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
