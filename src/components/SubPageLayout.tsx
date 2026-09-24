import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/** 設定・ヘルプなど、必要なときだけ開くサブページの共通レイアウト */
export function SubPageLayout({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const back = () => {
    // 直接開かれた場合（履歴がない場合）もエディタへ戻れるようにする
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  };
  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton edge="start" aria-label="戻る" onClick={back} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ py: 2, pb: 6 }}>
        {children}
      </Container>
    </Box>
  );
}

/** M3 のカード風セクション */
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mb: 3 }}>
      {title && (
        <Typography
          variant="subtitle2"
          component="h2"
          sx={{ color: 'primary.main', fontWeight: 600, px: 1, mb: 1 }}
        >
          {title}
        </Typography>
      )}
      <Box sx={(t) => ({ bgcolor: t.m3.surfaceContainerLow, borderRadius: '16px', overflow: 'hidden' })}>
        {children}
      </Box>
    </Box>
  );
}
