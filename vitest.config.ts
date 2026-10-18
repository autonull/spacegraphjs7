import { resolve } from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^spacegraphjs$/, replacement: resolve(__dirname, 'src/index.ts') },
      { find: /^spacegraphjs\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
    ],
  },
  test: {
    environment: 'jsdom',
    // Only run unit tests here (keep Playwright E2E specs out of Vitest)
    include: ['test/**/*.test.ts'],
    // n8n-bridge is out of scope for the session-graph prototype and excluded from the workspace.
    exclude: [...configDefaults.exclude, 'test/n8n-bridge.test.ts'],
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
