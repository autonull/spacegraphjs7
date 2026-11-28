import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
        environment: 'node',
        pool: 'vmThreads',
        passWithNoTests: true,
        setupFiles: [resolve(import.meta.dirname, '../../../test/setupTests.ts')],
    },
});
