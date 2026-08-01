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
        // firebase-messaging-sw.js は Firebase JS SDK が別 scope で管理する SW なので、
        // VitePWA の precache に入れると Chrome が register 時に古い版を cache から受け取り、
        // 新版 handler が実機で永遠に active にならない (実機で observed)。除外必須。
        globIgnores: ['**/firebase-messaging-sw.js'],
        // 通常の runtime caching で /firebase-messaging-sw.js を横取りしないよう明示。
        navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/],
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
