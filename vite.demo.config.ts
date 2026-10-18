import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  publicDir: '../public',
  resolve: {
    // Regex aliases: a bare string `spacegraphjs` would also capture subpath imports and rewrite
    // `spacegraphjs/layout` to `src/index.ts/layout`.
    alias: [
      { find: /^@src\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
      { find: /^spacegraphjs$/, replacement: resolve(__dirname, 'src/index.ts') },
      { find: /^spacegraphjs\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
      { find: /^@spacegraphjs\/renderer$/, replacement: resolve(__dirname, 'packages/renderer/src/index.ts') },
      {
        find: /^@spacegraphjs\/spacegraph-renderer$/,
        replacement: resolve(__dirname, 'packages/spacegraph-renderer/src/index.ts'),
      },
      {
        find: /^@spacegraphjs\/cytoscape-renderer$/,
        replacement: resolve(__dirname, 'packages/cytoscape-renderer/src/index.ts'),
      },
      { find: /^@spacegraphjs\/svg-renderer$/, replacement: resolve(__dirname, 'packages/svg-renderer/src/index.ts') },
      { find: /^\.\.\/framework$/, replacement: resolve(__dirname, 'demo/framework.ts') },
    ],
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
