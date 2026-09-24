import type { SxProps, Theme } from '@mui/material/styles';

/** ProseMirror が生成する DOM へのスタイル */
export function editorContentSx(fontSize: number, lineHeight: number, compact = false): SxProps<Theme> {
  return (theme) => ({
    '& .ProseMirror': {
      outline: 'none',
      minHeight: '60vh',
      fontSize,
      lineHeight,
      color: theme.m3.onSurface,
      wordBreak: 'break-word',
      caretColor: theme.palette.primary.main,
      '& > * + *': { mt: 0 },
      '& p': { my: 0 },
      '& h1, & h2, & h3': { lineHeight: 1.4, mt: compact ? '0.7em' : '1.2em', mb: compact ? '0.2em' : '0.4em', fontWeight: 700 },
      '& h1': { fontSize: '1.6em' },
      '& h2': { fontSize: '1.35em' },
      '& h3': { fontSize: '1.15em' },
      '& > :first-child': { mt: 0 },
      '& ul, & ol': { my: '0.4em', pl: '1.6em' },
      '& li > p': { my: 0 },
      '& blockquote': {
        my: '0.6em',
        mx: 0,
        pl: 2,
        py: 0.25,
        borderLeft: `4px solid ${theme.m3.outlineVariant}`,
        color: theme.m3.onSurfaceVariant,
      },
      '& code': {
        fontFamily: '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '0.9em',
        bgcolor: theme.m3.surfaceContainerHigh,
        borderRadius: '6px',
        px: '0.35em',
        py: '0.1em',
      },
      '& pre': {
        my: '0.6em',
        p: 2,
        borderRadius: '12px',
        bgcolor: theme.m3.surfaceContainer,
        overflowX: 'auto',
        '& code': { bgcolor: 'transparent', p: 0, fontSize: '0.88em' },
      },
      '& hr': {
        border: 'none',
        borderTop: `1px solid ${theme.m3.outlineVariant}`,
        my: 2,
      },
      '& a': { color: theme.palette.primary.main, textDecoration: 'underline', cursor: 'text' },
      '& .tableWrapper': { overflowX: 'auto', my: '0.6em' },
      '& table': {
        borderCollapse: 'collapse',
        width: '100%',
        tableLayout: 'fixed',
        '& td, & th': {
          border: `1px solid ${theme.m3.outlineVariant}`,
          p: '6px 10px',
          verticalAlign: 'top',
          minWidth: '4em',
          position: 'relative',
        },
        '& th': { bgcolor: theme.m3.surfaceContainer, fontWeight: 700, textAlign: 'left' },
        '& .selectedCell::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          bgcolor: theme.palette.primary.main,
          opacity: 0.12,
          pointerEvents: 'none',
        },
      },
      '& .search-match': {
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 213, 79, 0.28)' : 'rgba(255, 213, 79, 0.55)',
        borderRadius: '2px',
      },
      '& .search-match-current': {
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.6)' : 'rgba(255, 152, 0, 0.7)',
        outline: `1px solid ${theme.palette.mode === 'dark' ? '#ffb74d' : '#e65100'}`,
      },
      // 空の意味ブロック: 役割ごとの書き方の例（AiBlockView が --ai-hint に設定）
      '& .ai-block-content p.is-empty:only-child::before': {
        content: 'var(--ai-hint)',
        color: theme.m3.outline,
        float: 'left',
        height: 0,
        pointerEvents: 'none',
        fontSize: '0.92em',
      },
      '& > p.is-editor-empty:first-child::before': {
        content: 'attr(data-placeholder)',
        color: theme.m3.outline,
        float: 'left',
        height: 0,
        pointerEvents: 'none',
      },
    },
  });
}
