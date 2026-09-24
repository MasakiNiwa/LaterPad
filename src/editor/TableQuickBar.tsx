import { useEditorState, type Editor } from '@tiptap/react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import BorderBottomIcon from '@mui/icons-material/BorderBottom';
import BorderRightIcon from '@mui/icons-material/BorderRight';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';

/**
 * 表の中にカーソルがあるときだけ出る、よく使う表操作のショートカット列。
 * その他の操作はツールバーの「表」グループにある。
 */
export function TableQuickBar({ editor }: { editor: Editor }) {
  const inTable = useEditorState({ editor, selector: ({ editor: e }) => e.isActive('table') });
  if (!inTable) return null;
  const chain = () => editor.chain().focus();
  const actions = [
    { label: '行を足す', icon: <BorderBottomIcon />, run: () => chain().addRowAfter().run() },
    { label: '列を足す', icon: <BorderRightIcon />, run: () => chain().addColumnAfter().run() },
    { label: '行を削除', icon: <TableRowsOutlinedIcon />, run: () => chain().deleteRow().run() },
    { label: '列を削除', icon: <ViewColumnOutlinedIcon />, run: () => chain().deleteColumn().run() },
  ];

  return (
    <Box
      aria-label="表の操作"
      sx={(t) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 1,
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
      <TableChartOutlinedIcon fontSize="small" sx={(t) => ({ color: t.m3.onPrimaryContainer, mr: 0.5 })} />
      {actions.map((a) => (
        <Chip
          key={a.label}
          icon={a.icon}
          label={a.label}
          onClick={a.run}
          onMouseDown={(e) => e.preventDefault()}
          sx={(t) => ({
            bgcolor: t.m3.surface,
            borderRadius: '10px',
            fontWeight: 500,
            '& .MuiChip-icon': { fontSize: 18 },
          })}
        />
      ))}
    </Box>
  );
}
