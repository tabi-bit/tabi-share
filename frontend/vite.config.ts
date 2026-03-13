import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
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
  plugins: [react(), tailwindcss()],
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
