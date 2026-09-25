import { useState, type CSSProperties, type ReactNode } from 'react';
import { TextSelection } from '@tiptap/pm/state';
import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import InputBase from '@mui/material/InputBase';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { alpha } from '@mui/material/styles';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LayersClearOutlinedIcon from '@mui/icons-material/LayersClearOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import type { DocNode } from '../../core/document';
import { renderWithAiBlocks } from '../../core/export/aiPrompt';
import { copyText } from '../../lib/clipboard';
import { notify } from '../../lib/notify';
import { AI_BLOCK_ROLES, roleInfo, type AiBlockRole } from '../../core/aiBlocks';
import { ROLE_STYLE } from './roleStyle';
import { startBlockDrag } from './blockDrag';

/** 意味ブロックの見た目。上部に役割のラベル（種類の変更・名前・解除）を表示する */
export function AiBlockView({ node, updateAttributes, editor, getPos }: ReactNodeViewProps) {
  const info = roleInfo(node.attrs.role);
  const style = ROLE_STYLE[info.role];
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const label = (node.attrs.label as string | null) ?? '';
  // 名前は入力中は手元の状態だけを更新し、確定時（フォーカスが外れた時・Enter）に文書へ反映する。
  // 1 文字ごとに文書を更新すると、エディタが選択範囲を取り戻して日本語入力（変換）が途切れるため。
  const [draft, setDraft] = useState(label);
  const [editing, setEditing] = useState(false);
  if (!editing && draft !== label) setDraft(label);
  const commitLabel = () => {
    const next = draft.trim() || null;
    if (next !== (node.attrs.label ?? null)) updateAttributes({ label: next });
  };

  const unwrap = () => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    // ブロックの中身を残したまま、囲みだけを外す
    editor.chain().focus().setTextSelection(pos + 2).lift('aiBlock').run();
  };

  /** このブロックの位置を使って操作する */
  const run = (fn: (pos: number) => void) => {
    const pos = getPos();
    if (typeof pos === 'number') fn(pos);
  };
  const canMove = (direction: -1 | 1) => {
    const pos = getPos();
    if (typeof pos !== 'number') return false;
    const $pos = editor.state.doc.resolve(pos);
    return !!$pos.parent.maybeChild($pos.index() + direction);
  };
  const copyContent = async () => {
    const text = renderWithAiBlocks((node.toJSON() as DocNode).content ?? []);
    if (!text) {
      notify('このブロックは空です');
      return;
    }
    try {
      await copyText(text);
      notify(`「${info.label}」の中身をコピーしました（${text.length.toLocaleString()} 文字）`);
    } catch {
      notify('コピーできませんでした');
    }
  };
  const actionItem = (icon: ReactNode, text: string, onClick: () => void, disabled = false) => (
    <MenuItem
      disabled={disabled}
      onClick={() => {
        setAnchor(null);
        onClick();
      }}
    >
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={text} />
    </MenuItem>
  );

  return (
    <NodeViewWrapper
      data-ai-block={info.role}
      style={{ margin: '0.6em 0' }}
    >
      <Box
        sx={(t) => {
          const c = t.palette.mode === 'dark' ? style.dark : style.light;
          return {
            position: 'relative',
            borderLeft: `3px ${info.role === 'note' ? 'dashed' : 'solid'} ${c}`,
            bgcolor: alpha(c, t.palette.mode === 'dark' ? 0.1 : 0.06),
            borderRadius: '0 10px 10px 0',
            pl: 1.5,
            pr: 1,
            pt: 0.25,
            pb: 0.5,
            opacity: info.role === 'note' ? 0.8 : 1,
            '--ai-color': c,
          };
        }}
      >
        <Box contentEditable={false} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, userSelect: 'none', mb: 0.25 }}>
          {/* つまみ: 押したまま上下に動かして並べ替え（マウス・タッチ共通） */}
          <Box
            role="button"
            aria-label="押したまま動かして並べ替え"
            title="押したまま上下に動かして並べ替え"
            onPointerDown={(e) => {
              const pos = getPos();
              if (typeof pos === 'number') startBlockDrag(e, editor, pos);
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              ml: -1.25,
              mr: -0.25,
              // タッチでも掴みやすいよう当たり判定を広げる
              width: { xs: 32, sm: 22 },
              height: { xs: 28, sm: 22 },
              my: { xs: -0.5, sm: 0 },
              borderRadius: '6px',
              color: 'text.disabled',
              cursor: 'grab',
              touchAction: 'none',
              '&:active': { cursor: 'grabbing', bgcolor: 'action.selected' },
              '&:hover': { color: 'var(--ai-color)' },
            }}
          >
            <DragIndicatorIcon sx={{ fontSize: 18 }} />
          </Box>
          <ButtonBase
            onClick={(e) => setAnchor(e.currentTarget)}
            aria-label={`${info.label}ブロック（種類を変更）`}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.75,
              py: 0.125,
              ml: -0.75,
              borderRadius: '6px',
              color: 'var(--ai-color)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.3,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {style.icon('inherit')}
            {info.label}
            <ArrowDropDownIcon sx={{ fontSize: 16, ml: -0.25 }} />
          </ButtonBase>
          <InputBase
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              commitLabel();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                setEditing(false);
                commitLabel();
                const pos = getPos();
                if (typeof pos !== 'number') return;
                // 名前を付けたら、続けて中身を書けるようブロック内の文末へカーソルを移す
                // （commands.focus は非同期のため、同期的にフォーカスを移して入力の取りこぼしを防ぐ）
                editor.view.focus();
                const { state } = editor.view;
                const end = state.doc.resolve(pos + node.nodeSize - 1);
                editor.view.dispatch(state.tr.setSelection(TextSelection.near(end, -1)).scrollIntoView());
              }
            }}
            placeholder={info.role === 'note' ? 'AI には送られません' : '名前（任意）'}
            inputProps={{ 'aria-label': `${info.label}ブロックの名前`, maxLength: 60, spellCheck: false }}
            sx={{ flex: 1, minWidth: 0, fontSize: 12, color: 'text.secondary', '& input': { py: 0.25 } }}
          />
        </Box>
        <NodeViewContent
          className="ai-block-content"
          style={{ '--ai-hint': JSON.stringify(info.hint) } as CSSProperties}
        />
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} disableRestoreFocus>
        {AI_BLOCK_ROLES.map((r) => (
          <MenuItem
            key={r.role}
            selected={r.role === info.role}
            onClick={() => {
              setAnchor(null);
              updateAttributes({ role: r.role as AiBlockRole });
            }}
          >
            <ListItemIcon sx={(t) => ({ color: t.palette.mode === 'dark' ? ROLE_STYLE[r.role].dark : ROLE_STYLE[r.role].light })}>
              {ROLE_STYLE[r.role].icon()}
            </ListItemIcon>
            <ListItemText primary={r.label} secondary={r.description} />
          </MenuItem>
        ))}
        <Divider />
        {actionItem(<ArrowUpwardIcon fontSize="small" />, '上へ移動', () => run((pos) => editor.chain().focus().moveAiBlockAt(pos, -1).run()), !canMove(-1))}
        {actionItem(<ArrowDownwardIcon fontSize="small" />, '下へ移動', () => run((pos) => editor.chain().focus().moveAiBlockAt(pos, 1).run()), !canMove(1))}
        <Divider />
        {actionItem(<SelectAllIcon fontSize="small" />, '中身を選択', () => run((pos) => editor.chain().focus().selectAiBlockContentAt(pos).run()))}
        {actionItem(<ContentCopyIcon fontSize="small" />, '中身をコピー', () => void copyContent())}
        {actionItem(<ClearAllIcon fontSize="small" />, '中身をすべて削除', () => run((pos) => editor.chain().focus().clearAiBlockContentAt(pos).run()))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            unwrap();
          }}
        >
          <ListItemIcon>
            <LayersClearOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="ブロックを解除" secondary="中の文章は残します" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            run((pos) => editor.chain().focus().deleteAiBlockAt(pos).run());
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="ブロックを削除" secondary="中の文章ごと削除します（戻すで取り消せます）" />
        </MenuItem>
      </Menu>
    </NodeViewWrapper>
  );
}
