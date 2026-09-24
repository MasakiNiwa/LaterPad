import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

// GitHub Pages ではサブパス (/LaterPad/) で配信されるため相対パスでビルドする。
// ルーティングは HashRouter を使うのでサーバー側の設定は不要。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // MUI + Tiptap で 1MB 前後になるため警告閾値を調整（gzip 後は約 330KB）
    chunkSizeWarningLimit: 1500,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  test: {
    environment: 'node',
  },
});
