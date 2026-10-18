import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { protojamAgent } from './agent/vitePlugin.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    protojamAgent(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: true
  }
});
