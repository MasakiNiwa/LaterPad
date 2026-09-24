import { createTheme, type Theme } from '@mui/material/styles';

/**
 * Material Design 3 のトーンを MUI テーマで表現する。
 * 色はベースラインのインディゴ系パレットから作成。
 */
const tokens = {
  light: {
    primary: '#4355b9',
    onPrimary: '#ffffff',
    primaryContainer: '#dee0ff',
    onPrimaryContainer: '#00105c',
    secondary: '#5b5d72',
    surface: '#fbf8ff',
    surfaceContainerLow: '#f5f2fa',
    surfaceContainer: '#efedf4',
    surfaceContainerHigh: '#e9e7ef',
    onSurface: '#1b1b21',
    onSurfaceVariant: '#46464f',
    outline: '#767680',
    outlineVariant: '#c6c5d0',
    error: '#ba1a1a',
  },
  dark: {
    primary: '#bac3ff',
    onPrimary: '#08218a',
    primaryContainer: '#293ca0',
    onPrimaryContainer: '#dee0ff',
    secondary: '#c4c5dd',
    surface: '#121318',
    surfaceContainerLow: '#1b1b21',
    surfaceContainer: '#1f1f25',
    surfaceContainerHigh: '#2a292f',
    onSurface: '#e4e1e9',
    onSurfaceVariant: '#c6c5d0',
    outline: '#90909a',
    outlineVariant: '#46464f',
    error: '#ffb4ab',
  },
};

export type SurfaceTokens = (typeof tokens)['light'];

declare module '@mui/material/styles' {
  interface Theme {
    m3: SurfaceTokens;
  }
  interface ThemeOptions {
    m3?: SurfaceTokens;
  }
}

export function createAppTheme(mode: 'light' | 'dark'): Theme {
  const c = tokens[mode];
  return createTheme({
    m3: c,
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.onPrimary },
      secondary: { main: c.secondary },
      error: { main: c.error },
      background: { default: c.surface, paper: c.surfaceContainerLow },
      text: { primary: c.onSurface, secondary: c.onSurfaceVariant },
      divider: c.outlineVariant,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        '"Roboto", "Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Meiryo", system-ui, sans-serif',
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.1 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: c.surface },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: { root: { backgroundColor: c.surface, color: c.onSurface } },
      },
      MuiButton: {
        styleOverrides: { root: { borderRadius: 999, paddingInline: 20 } },
      },
      MuiFab: {
        styleOverrides: { root: { borderRadius: 16, textTransform: 'none', fontWeight: 600 } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 28, backgroundColor: c.surfaceContainerHigh } },
      },
      MuiMenu: {
        styleOverrides: { paper: { borderRadius: 8, backgroundColor: c.surfaceContainer } },
      },
      MuiTooltip: {
        defaultProps: { enterDelay: 500 },
      },
      MuiSnackbarContent: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiToggleButton: {
        styleOverrides: { root: { textTransform: 'none' } },
      },
    },
  });
}
