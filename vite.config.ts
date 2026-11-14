import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The lazily-loaded three.js chunk (3D player + ?fly world) is ~715 KB by design.
  build: { chunkSizeWarningLimit: 750 },
});
