import { defineConfig } from '@tailwindcss/vite';

// biome-ignore lint/style/noDefaultExport: 'Tailwind config is typically a default export'
export default defineConfig({
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
});
