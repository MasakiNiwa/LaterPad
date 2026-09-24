import type { MouseEvent, ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { isCoarsePointer } from '../lib/viewport';

/** アイコンの下にラベルが付いた操作ボタンを横に並べるバー */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <Box
      role="toolbar"
      aria-label="操作"
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        gap: { xs: 0, sm: 0.5 },
        px: { xs: 0.5, sm: 1.5 },
        py: 0.5,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        '& > *': { flexShrink: 0 },
      }}
    >
      {children}
    </Box>
  );
}

interface ActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick: (e: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  active?: boolean;
  /** 強調色で表示する（保存が必要な時など） */
  accent?: boolean;
  tooltip?: string;
  /**
   * 押したときに本文の入力状態（カーソル）を保つ。戻す・進むなど、続けて入力する操作向け。
   * false の場合、スマホではボタンを押すと本文の入力を終えてソフトウェアキーボードを閉じる。
   */
  keepFocus?: boolean;
  /** スマホ幅では表示しない */
  hideOnMobile?: boolean;
  /** 主要な操作として塗りつぶしで強調する（AI用にコピー） */
  primary?: boolean;
}

export function ActionButton({ icon, label, onClick, disabled, active, accent, tooltip, keepFocus, hideOnMobile, primary }: ActionButtonProps) {
  const button = (
    <ButtonBase
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={(e) => {
        if (!keepFocus && isCoarsePointer()) (document.activeElement as HTMLElement | null)?.blur?.();
        onClick(e);
      }}
      // PC ではエディタの選択範囲を保ったまま操作できるようにする
      onMouseDown={(e) => {
        if (keepFocus || !isCoarsePointer()) e.preventDefault();
      }}
      sx={(t) => ({
        display: hideOnMobile ? { xs: 'none', sm: 'flex' } : 'flex',
        flexDirection: 'column',
        // スマホではボタンを均等幅で並べ、横スクロールなしで収める
        flex: { xs: '1 1 0', sm: '0 0 auto' },
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        minWidth: { xs: 'fit-content', sm: 60 },
        px: primary ? { xs: 0.75, sm: 1.5 } : { xs: 0, sm: 0.75 },
        py: 0.5,
        borderRadius: '12px',
        color: disabled
          ? t.palette.text.disabled
          : primary
            ? t.palette.primary.contrastText
            : accent
              ? t.palette.primary.main
              : t.m3.onSurface,
        bgcolor: primary ? t.palette.primary.main : active ? t.m3.primaryContainer : 'transparent',
        ml: primary ? { sm: 'auto' } : undefined,
        transition: 'background-color 120ms',
        '&:hover': {
          bgcolor: primary ? t.palette.primary.dark : active ? t.m3.primaryContainer : t.palette.action.hover,
        },
        '& svg': { fontSize: 24 },
      })}
    >
      {icon}
      <Box component="span" sx={{ fontSize: { xs: 10, sm: 11 }, lineHeight: 1.3, fontWeight: 500, whiteSpace: 'nowrap', letterSpacing: { xs: '-0.02em', sm: 0 } }}>
        {label}
      </Box>
    </ButtonBase>
  );
  if (!tooltip || disabled) return button;
  return <Tooltip title={tooltip}>{button}</Tooltip>;
}

export function ActionDivider() {
  return <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1, display: { xs: 'none', sm: 'block' } }} />;
}
