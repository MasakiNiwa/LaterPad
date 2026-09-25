import { useEffect, useRef, useState, type ReactNode } from 'react';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckIcon from '@mui/icons-material/Check';

export type GroupEntry =
  | {
      kind?: 'item';
      label: string;
      icon: ReactNode;
      /** 補足説明（2 行目に表示） */
      description?: string;
      shortcut?: string;
      active?: boolean;
      disabled?: boolean;
      danger?: boolean;
      /** 選択後にメニューを閉じない（連続操作向け） */
      keepOpen?: boolean;
      /** anchor はグループのボタン要素 */
      onSelect: (anchor: HTMLElement) => void;
    }
  | { kind: 'divider' }
  | { kind: 'header'; label: string; /** アクション列で使う短い見出し */ short?: string };

interface GroupMenuProps {
  label: string;
  icon: ReactNode;
  entries: GroupEntry[];
  /** グループ内のいずれかの書式が有効なとき強調表示する */
  active?: boolean;
  /** ツールバー上のボタンを目立たせる（表の中にいるときなど） */
  highlight?: boolean;
  /** 文字を省略してアイコンだけで表示する（圧縮表示） */
  compact?: boolean;
}

/**
 * 書式をグループ単位でまとめたツールバーボタン。
 * ボタンを押すと、そのグループの機能がアイコン・名前・ショートカット付きで一覧表示される。
 */
export function GroupMenu({ label, icon, entries, active, highlight, compact }: GroupMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 強調表示のグループ（表など）が現れたら、スマホの横スクロールでも見える位置へ寄せる
  useEffect(() => {
    if (highlight) buttonRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [highlight]);

  return (
    <>
      <Button
        ref={buttonRef}
        size="small"
        color="inherit"
        startIcon={compact ? undefined : icon}
        endIcon={<ArrowDropDownIcon sx={{ ml: -0.75 }} />}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-label={compact ? label : undefined}
        title={compact ? label : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        // エディタの選択範囲を保ったまま操作できるようにする
        onMouseDown={(e) => e.preventDefault()}
        sx={(t) => ({
          flexShrink: 0,
          px: 1.25,
          minWidth: 0,
          height: 36,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          color: active || highlight ? t.m3.onPrimaryContainer : t.m3.onSurfaceVariant,
          bgcolor: active || highlight ? t.m3.primaryContainer : 'transparent',
          outline: highlight ? `2px solid ${t.palette.primary.main}` : 'none',
          outlineOffset: -2,
          '&:hover': { bgcolor: active || highlight ? t.m3.primaryContainer : undefined },
          '& .MuiButton-startIcon': { mr: 0.5 },
        })}
      >
        {compact ? icon : label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        slotProps={{ paper: { sx: { minWidth: 240 } }, list: { dense: false } }}
        // メニュー操作でエディタからフォーカスを奪い過ぎないよう、閉じた後はエディタへ戻す
        disableRestoreFocus
      >
        {entries.map((entry, i) => {
          if (entry.kind === 'divider') return <Divider key={`d${i}`} />;
          if (entry.kind === 'header')
            return (
              <ListSubheader key={`h${i}`} sx={{ bgcolor: 'transparent', lineHeight: '32px' }}>
                {entry.label}
              </ListSubheader>
            );
          return (
            <MenuItem
              key={entry.label}
              disabled={entry.disabled}
              selected={entry.active}
              onClick={() => {
                // メニュー項目は閉じると消えるため、続けて開く UI はグループのボタンを基準にする
                const button = anchor!;
                if (!entry.keepOpen) close();
                entry.onSelect(button);
              }}
              sx={entry.danger ? { color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } } : undefined}
            >
              <ListItemIcon>{entry.icon}</ListItemIcon>
              <ListItemText
                primary={entry.label}
                secondary={entry.description}
                slotProps={{ secondary: { variant: 'caption' } }}
                sx={{ my: entry.description ? 0.25 : undefined }}
              />
              {entry.shortcut && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 3, display: { xs: 'none', sm: 'block' } }}>
                  {entry.shortcut}
                </Typography>
              )}
              {entry.active && <CheckIcon fontSize="small" sx={{ ml: 1.5, color: 'primary.main' }} />}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
