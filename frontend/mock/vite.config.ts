import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * 実アプリ (frontend/index.html + src/main.tsx) をそのまま起動し、API だけ MSW で差し替える共有用モック。
 * エントリを mock/src/main.ts に差し替え、/api の横取りを仕込んでから src/main.tsx を読み込む。
 */
const MOCK_API_BASE = '/api';

const SRC = path.resolve(__dirname, '../src');
const OVERRIDES_DIR = path.resolve(__dirname, 'overrides');

/**
 * mock/overrides/ 以下に src/ と同じ相対パスで置いたファイルを、実ファイルの代わりに読み込む。
 * モジュール ID は実ファイルのままなので、他の src のコードからの import はそのまま差し替わる。
 * 差し替えファイル内の import は '@/...' の絶対パスで書くこと（相対パスは実ファイル位置基準で解決される）。
 */
const srcOverrides = (): Plugin => {
  const overrideOf = (id: string): string | null => {
    const file = id.split('?')[0];
    if (!file.startsWith(SRC)) return null;
    const candidate = path.join(OVERRIDES_DIR, path.relative(SRC, file));
    return fs.existsSync(candidate) ? candidate : null;
  };
  return {
    name: 'src-overrides',
    enforce: 'pre',
    load: id => {
      const override = overrideOf(id);
      return override ? fs.readFileSync(override, 'utf-8') : null;
    },
    configureServer: server => {
      server.watcher.add(OVERRIDES_DIR);
      server.watcher.on('change', file => {
        if (!file.startsWith(OVERRIDES_DIR)) return;
        const real = path.join(SRC, path.relative(OVERRIDES_DIR, file));
        for (const mod of server.moduleGraph.getModulesByFile(real) ?? []) {
          server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
};

const mockEntry = (): Plugin => ({
  name: 'mock-entry',
  transformIndexHtml: html => html.replace('/src/main.tsx', '/mock/src/main.ts'),
});

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  // frontend 直下の .env を読まないよう、モック専用ディレクトリを指す
  envDir: __dirname,
  define: {
    __BUILD_ID__: JSON.stringify('mock'),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(MOCK_API_BASE),
    // 未設定だと getAuth() が auth/invalid-api-key で throw して App ごと落ちるため、ダミー値を入れる
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify('mock-api-key'),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify('mock.firebaseapp.com'),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify('mock-project'),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify('1:000000000000:web:mock'),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify('000000000000'),
  },
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    // cloudflared tunnel 経由のホスト名を許可する
    allowedHosts: true,
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
    tailwindcss(),
    mockEntry(),
    srcOverrides(),
  ],
  resolve: {
    alias: {
      '@': SRC,
      '@mock': path.resolve(__dirname, 'src'),
    },
  },
});
