import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const useHttps = process.env.USE_HTTPS === 'true' && fs.existsSync('.dev-key.pem') && fs.existsSync('.dev-cert.pem');

/**
 * ビルドごとに変わる ID。診断ログの各行に埋め込まれ、client と SW で値がズレていれば
 * 「古い SW が動いたまま」と判別できる (docs/debug_logger.md)。
 */
const BUILD_ID = randomUUID().slice(0, 8);

const SW_PATH = 'firebase-messaging-sw.js';
const BUILD_ID_TOKEN = '__BUILD_ID__';

/**
 * public/ は Vite が無変換でコピーするため define が効かない。SW 内の
 * `__BUILD_ID__` トークンを build 時とdev 配信時にそれぞれ置換する。
 */
const stampServiceWorkerBuildId = (): Plugin => ({
  name: 'stamp-sw-build-id',
  configureServer: server => {
    server.middlewares.use(`/${SW_PATH}`, (_req, res) => {
      const source = fs.readFileSync(path.resolve(__dirname, 'public', SW_PATH), 'utf-8');
      res.setHeader('Content-Type', 'application/javascript');
      res.end(source.replaceAll(BUILD_ID_TOKEN, BUILD_ID));
    });
  },
  // public/ のコピー完了後に走らせる必要があるので closeBundle を使う
  closeBundle: () => {
    const dist = path.resolve(__dirname, 'dist', SW_PATH);
    if (!fs.existsSync(dist)) return;
    fs.writeFileSync(dist, fs.readFileSync(dist, 'utf-8').replaceAll(BUILD_ID_TOKEN, BUILD_ID));
  },
});

// https://vite.dev/config/

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    ...(useHttps && {
      https: {
        key: fs.readFileSync('.dev-key.pem'),
        cert: fs.readFileSync('.dev-cert.pem'),
      },
    }),
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
    tailwindcss(),
    stampServiceWorkerBuildId(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['favicon.svg', 'favicon-*.svg', 'icons/*.png'],
      manifest: {
        name: 'たびしぇあ',
        short_name: 'たびしぇあ',
        description: '旅程を簡単に作成・共有',
        theme_color: '#f0fdfa',
        background_color: '#f0fdfa',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'ja',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // firebase-messaging-sw.js は別 scope で登録される独立 SW。VitePWA sw.js の
        // precache に紛れ込むと、Chrome の register 時に fetch handler が cache 経由で
        // 古い版を返し続けて更新が実機に届かなくなる。glob から除外必須。
        globIgnores: ['**/firebase-messaging-sw.js'],
        // /__/ は Firebase Hosting の予約パス (auth ハンドラ・init.json)。authDomain を
        // 自ドメインにしたことで Google 認証の popup / iframe が同一オリジンを開くようになり、
        // navigateFallback が横取りすると SPA が返って認証が 404 で失敗する。
        navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/, /^\/__\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
