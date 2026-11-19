import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import root from '../../vitest.config.ts';

const workspace = resolve(import.meta.dirname, '../..');

export default defineConfig({
    ...root,
    test: {
        ...root.test,
        include: ['tests/**/*.test.ts'],
        setupFiles: [
            resolve(workspace, 'test/setupTests.ts'),
            resolve(workspace, 'test/vitest.setup.ts'),
        ],
    },
});
