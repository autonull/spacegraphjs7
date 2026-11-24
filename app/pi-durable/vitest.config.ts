import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import root from '../../vitest.config.ts';

const workspace = resolve(import.meta.dirname, '../..');

export default defineConfig({
    ...root,
    resolve: {
        ...root.resolve,
        alias: [
            ...(Array.isArray(root.resolve?.alias) ? root.resolve.alias : []),
            {
                find: /^@spacegraphjs\/agent$/,
                replacement: resolve(workspace, 'packages/domain/agent/src/index.ts'),
            },
            {
                find: /^pi-kit$/,
                replacement: resolve(workspace, 'app/pi-kit/src/index.ts'),
            },
        ],
    },
    test: {
        ...root.test,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        setupFiles: [
            resolve(workspace, 'test/setupTests.ts'),
            resolve(workspace, 'test/vitest.setup.ts'),
        ],
    },
});
