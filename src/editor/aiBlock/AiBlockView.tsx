import { useState } from 'react';
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
import { AI_BLOCK_ROLES, roleInfo, type AiBlockRole } from '../../core/aiBlocks';
import { ROLE_STYLE } from './roleStyle';

/** 意味ブロックの見た目。上部に役割のラベル（種類の変更・名前・解除）を表示する */
export function AiBlockView({ node, updateAttributes, editor, getPos }: ReactNodeViewProps) {
  const info = roleInfo(node.attrs.role);
  const style = ROLE_STYLE[info.role];
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const label = (node.attrs.label as string | null) ?? '';

  const unwrap = () => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    // ブロックの中身を残したまま、囲みだけを外す
    editor.chain().focus().setTextSelection(pos + 2).lift('aiBlock').run();
  };

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
            value={label}
            onChange={(e) => updateAttributes({ label: e.target.value || null })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
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
        <NodeViewContent className="ai-block-content" />
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
      </Menu>
    </NodeViewWrapper>
  );
}
