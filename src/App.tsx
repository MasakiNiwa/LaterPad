import { useMemo } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider } from '@mui/material/styles';
import { EditorPage } from './pages/EditorPage';
import { HelpPage } from './pages/HelpPage';
import { SettingsPage } from './pages/SettingsPage';
import { SettingsProvider, useSettings } from './settings/SettingsContext';
import { createAppTheme } from './theme';

function ThemedApp() {
  const { settings } = useSettings();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const mode = settings.themeMode === 'system' ? (prefersDark ? 'dark' : 'light') : settings.themeMode;
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <HashRouter>
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <ThemedApp />
    </SettingsProvider>
  );
}
