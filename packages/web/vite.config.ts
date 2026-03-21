import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages deploys to /claw-visual/
// Override with VITE_BASE env var if deploying elsewhere
const base = process.env.VITE_BASE || '/claw-visual/';

export default defineConfig({
  plugins: [react()],
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
