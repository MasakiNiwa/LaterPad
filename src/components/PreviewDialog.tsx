import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  text: string;
  formatLabel: string;
  onCopy: () => void;
}

/** AI に渡されるテキストをそのまま確認するためのダイアログ */
export function PreviewDialog({ open, onClose, text, formatLabel, onCopy }: PreviewDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 0.5 }}>コピー内容のプレビュー</DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
        形式: {formatLabel}・{text.length.toLocaleString()} 文字
      </Typography>
      <DialogContent>
        <Box
          component="pre"
          sx={(t) => ({
            m: 0,
            p: 2,
            borderRadius: 3,
            bgcolor: t.m3.surfaceContainerLow,
            fontFamily: '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 14,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: 120,
          })}
        >
          {text || '（まだ何も書かれていません）'}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>閉じる</Button>
        <Button
          variant="contained"
          disableElevation
          startIcon={<ContentCopyIcon />}
          disabled={!text}
          onClick={onCopy}
        >
          AI用にコピー
        </Button>
      </DialogActions>
    </Dialog>
  );
}
