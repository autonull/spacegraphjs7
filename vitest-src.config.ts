import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/** Runs a package's source-colocated unit tests without the repository-wide aliases and setup. */
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        // Most source-colocated tests are pure logic; DOM tests opt into jsdom per file.
        environment: 'node',
        pool: 'vmThreads',
        passWithNoTests: true,
        setupFiles: [resolve(import.meta.dirname, 'test/setupTests.ts')],
    },
});
