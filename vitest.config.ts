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
        include: ['test/**/*.test.ts'],
        globals: false,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/vision/**'],
        },
    },
});
