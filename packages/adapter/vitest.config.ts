import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// The package's tests run under Vitest so `vitest run` works from this directory; the contract
// package resolves through the workspace source, the way the root config does.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@spacegraphjs\/renderer$/, replacement: resolve(import.meta.dirname, '../renderer/src/index.ts') }],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
