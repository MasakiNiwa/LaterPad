import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { DiffResult } from '../../core/diff';

const MONO = '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export function TextView({ text }: { text: string }) {
  return (
    <Box
      component="pre"
      sx={(t) => ({
        m: 0,
        p: 1.5,
        borderRadius: '12px',
        bgcolor: t.m3.surfaceContainerLow,
        fontFamily: MONO,
        fontSize: 13,
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      })}
    >
      {text || '（空の文書）'}
    </Box>
  );
}

export function DiffView({ diff }: { diff: DiffResult }) {
  if (diff.added === 0 && diff.removed === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
        違いはありません
      </Typography>
    );
  }
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>
          +{diff.added}
        </Box>{' '}
        <Box component="span" sx={{ color: 'error.main', fontWeight: 600 }}>
          −{diff.removed}
        </Box>{' '}
        行
      </Typography>
      <Box
        sx={(t) => ({
          borderRadius: '12px',
          overflow: 'hidden',
          bgcolor: t.m3.surfaceContainerLow,
          fontFamily: MONO,
          fontSize: 13,
          lineHeight: 1.7,
        })}
      >
        {diff.lines.map((line, i) => (
          <Box
            key={i}
            sx={(t) => ({
              display: 'flex',
              px: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              bgcolor:
                line.kind === 'added'
                  ? alpha(t.palette.success.main, 0.14)
                  : line.kind === 'removed'
                    ? alpha(t.palette.error.main, 0.14)
                    : 'transparent',
              textDecoration: line.kind === 'removed' ? 'line-through' : 'none',
              textDecorationColor: alpha(t.palette.error.main, 0.5),
            })}
          >
            <Box
              component="span"
              aria-hidden
              sx={{ width: '1.5em', flexShrink: 0, opacity: 0.6, userSelect: 'none' }}
            >
              {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '}
            </Box>
            <Box component="span" sx={{ minWidth: 0 }}>
              {line.text || ' '}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
