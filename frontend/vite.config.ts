import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const useHttps = process.env.USE_HTTPS === 'true' && fs.existsSync('.dev-key.pem') && fs.existsSync('.dev-cert.pem');

// https://vite.dev/config/

export default defineConfig({
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
