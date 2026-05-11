import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            'spacegraphjs': resolve(__dirname, 'src/index.ts')
        }
    },
    test: {
        environment: 'jsdom',
        // Only run unit tests here (keep Playwright E2E specs out of Vitest)
        include: ['test/**/*.test.ts'],
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
