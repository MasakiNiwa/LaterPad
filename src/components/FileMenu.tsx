import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SaveAsOutlinedIcon from '@mui/icons-material/SaveAsOutlined';
import { modKey } from '../lib/platform';

interface FileMenuProps {
  fileName: string | null;
  dirty: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

/** ファイル操作をまとめたメニュー。現在のファイル名と保存状態も表示する。 */
export function FileMenu({ fileName, dirty, onNew, onOpen, onSave, onSaveAs }: FileMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const mod = modKey();
  const run = (fn: () => void) => () => {
    setAnchor(null);
    fn();
  };
  const status = !fileName ? 'まだファイルに保存していません' : dirty ? '保存されていない変更があります' : '保存済み';

  return (
    <>
      <Tooltip title="ファイル（新規作成・開く・保存）">
        <Button
          color="inherit"
          aria-haspopup="menu"
          onClick={(e) => setAnchor(e.currentTarget)}
          startIcon={<DescriptionOutlinedIcon />}
          endIcon={<ArrowDropDownIcon sx={{ ml: -0.75 }} />}
          sx={{ display: { xs: 'none', sm: 'inline-flex' }, px: 1.5, flexShrink: 0 }}
        >
          ファイル
        </Button>
      </Tooltip>
      <Tooltip title="ファイル">
        <IconButton aria-label="ファイル" onClick={(e) => setAnchor(e.currentTarget)} sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
          <DescriptionOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { width: 300, maxWidth: 'calc(100vw - 32px)' } } }}
      >
        <Box sx={{ px: 2, pt: 1, pb: 1.5 }}>
          <Typography variant="subtitle2" noWrap title={fileName ?? undefined}>
            {fileName ?? '新しい文書'}
          </Typography>
          <Typography variant="caption" color={dirty && fileName ? 'warning.main' : 'text.secondary'}>
            {status}
          </Typography>
        </Box>
        <Divider />
        <Entry icon={<NoteAddOutlinedIcon />} label="新規作成" description="空の文書を作ります" onClick={run(onNew)} />
        <Entry icon={<FolderOpenOutlinedIcon />} label="開く…" description=".laterpad ファイルを開きます" shortcut={`${mod}+O`} onClick={run(onOpen)} />
        <Divider />
        <Entry
          icon={<SaveOutlinedIcon />}
          label="保存"
          description={fileName ? `「${fileName}」に保存します` : '保存先を選んで保存します'}
          shortcut={`${mod}+S`}
          onClick={run(onSave)}
        />
        <Entry icon={<SaveAsOutlinedIcon />} label="名前を付けて保存…" description="別のファイルとして保存します" onClick={run(onSaveAs)} />
      </Menu>
    </>
  );
}

function Entry({ icon, label, description, shortcut, onClick }: { icon: ReactNode; label: string; description: string; shortcut?: string; onClick: () => void }) {
  return (
    <MenuItem onClick={onClick} sx={{ alignItems: 'flex-start', py: 1 }}>
      <ListItemIcon sx={{ mt: 0.25 }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        secondary={description}
        slotProps={{ secondary: { noWrap: true, variant: 'caption', component: 'div' } }}
        sx={{ my: 0, minWidth: 0 }}
      />
      {shortcut && (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2, mt: 0.25, display: { xs: 'none', sm: 'block' } }}>
          {shortcut}
        </Typography>
      )}
    </MenuItem>
  );
}
