import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The lazily-loaded 3D player chunk (three.js) is ~510 KB by design.
  build: { chunkSizeWarningLimit: 600 },
});
