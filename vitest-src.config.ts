import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/** Runs a package's source-colocated unit tests without the repository-wide aliases and setup. */
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'jsdom',
        pool: 'vmThreads',
        passWithNoTests: true,
        setupFiles: [resolve(import.meta.dirname, 'test/setupTests.ts')],
    },
});
