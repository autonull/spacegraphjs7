import { resolve } from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^spacegraphjs$/, replacement: resolve(import.meta.dirname, 'src/index.ts') },
      { find: /^spacegraphjs\/(.+)$/, replacement: resolve(import.meta.dirname, 'src/$1') },
      // Workspace packages resolve from source under Vitest without a pnpm link (the documented alias fallback).
      { find: /^@spacegraphjs\/renderer$/, replacement: resolve(import.meta.dirname, 'packages/renderer/src/index.ts') },
      { find: /^@spacegraphjs\/adapter$/, replacement: resolve(import.meta.dirname, 'packages/adapter/src/index.ts') },
      {
        find: /^@spacegraphjs\/spacegraph-renderer$/,
        replacement: resolve(import.meta.dirname, 'packages/spacegraph-renderer/src/index.ts'),
      },
      {
        find: /^@spacegraphjs\/cytoscape-renderer$/,
        replacement: resolve(import.meta.dirname, 'packages/cytoscape-renderer/src/index.ts'),
      },
      { find: /^@spacegraphjs\/svg-renderer$/, replacement: resolve(import.meta.dirname, 'packages/svg-renderer/src/index.ts') },
      // Solid ships server and browser builds behind export conditions; Vitest resolves the server build,
      // which rejects client-only APIs. Point the framework binding tests at the browser builds.
      {
        find: /^solid-js$/,
        replacement: resolve(import.meta.dirname, 'packages/solid-spacegraph/node_modules/solid-js/dist/solid.js'),
      },
      {
        find: /^solid-js\/web$/,
        replacement: resolve(import.meta.dirname, 'packages/solid-spacegraph/node_modules/solid-js/web/dist/web.js'),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    pool: 'vmThreads',
    // Only run unit tests here (keep Playwright E2E specs out of Vitest). The framework bindings carry
    // their own lifecycle tests beside their source (P8.2).
    include: ['test/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    exclude: [...configDefaults.exclude],
    globals: false,
    // Setup file to provide node-canvas and DOM shims for jsdom
    setupFiles: ['test/setupTests.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/vision/**'],
    },
  },
});
