import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Default to root path (claw-visual.zxyh.club subdomain deployment)
// Set VITE_BASE=/claw-visual/ for GitHub Pages
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base,
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3200',
    },
  },
  build: {
    outDir: 'dist',
  },
});
