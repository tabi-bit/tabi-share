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
    react(),
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
        theme_color: '#0d9488',
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
