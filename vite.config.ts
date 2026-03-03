import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        spacegraphjs: resolve(__dirname, 'src/index.ts'),
        vision: resolve(__dirname, 'src/vision/index.ts'),
      },
      name: 'SpaceGraphJS',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['three'],
      output: {
        globals: {
          three: 'THREE',
        },
      },
    },
    sourcemap: true,
    minify: false, // Keep readable for debugging
  },
  server: {
    port: 5173,
    open: false, // Don't auto-open
  },
  root: '.', // Serve from project root
  publicDir: 'public', // Static assets
});