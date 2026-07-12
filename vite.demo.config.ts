import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  publicDir: '../public',
  resolve: {
    alias: {
      '@src': resolve(__dirname, 'src'),
      spacegraphjs: resolve(__dirname, 'src/index.ts'),
      '../src': resolve(__dirname, 'src'),
      '../framework': resolve(__dirname, 'demo/framework.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          monaco: ['@monaco-editor/loader'],
        },
      },
    },
  },
});
