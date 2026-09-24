import { useState } from 'react';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';

const MAX_ROWS = 8;
const MAX_COLS = 8;

interface TableSizePickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (rows: number, cols: number) => void;
}

/** マス目をなぞって表の大きさを選ぶ（タップでも選択できる） */
export function TableSizePicker({ anchorEl, onClose, onSelect }: TableSizePickerProps) {
  const [size, setSize] = useState({ rows: 3, cols: 3 });

  return (
    <Popover
      open={!!anchorEl}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: (t) => ({ p: 2, borderRadius: '16px', bgcolor: t.m3.surfaceContainer }) } }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        表を挿入：{size.rows} 行 × {size.cols} 列
      </Typography>
      <Box
        role="grid"
        aria-label="表の大きさ"
        sx={{ display: 'grid', gridTemplateColumns: `repeat(${MAX_COLS}, 28px)`, gap: '4px', touchAction: 'none' }}
      >
        {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
          const r = Math.floor(i / MAX_COLS) + 1;
          const c = (i % MAX_COLS) + 1;
          const on = r <= size.rows && c <= size.cols;
          return (
            <Box
              key={i}
              role="gridcell"
              aria-label={`${r} 行 × ${c} 列`}
              tabIndex={-1}
              onMouseEnter={() => setSize({ rows: r, cols: c })}
              onClick={() => onSelect(r, c)}
              sx={(t) => ({
                width: 28,
                height: 28,
                borderRadius: '6px',
                cursor: 'pointer',
                border: `1px solid ${on ? t.palette.primary.main : t.m3.outlineVariant}`,
                bgcolor: on ? t.m3.primaryContainer : t.m3.surface,
              })}
            />
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        1 行目は見出し行になります
      </Typography>
    </Popover>
  );
}
