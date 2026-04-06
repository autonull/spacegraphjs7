import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: 'demo',
    publicDir: '../public',
    resolve: {
        alias: {
            '../src': resolve(__dirname, 'src'),
            '../framework': resolve(__dirname, 'demo/framework.ts'),
        },
    },
    server: {
        port: 5173,
        open: true,
    },
    build: {
        outDir: '../dist-demo',
        emptyOutDir: true,
    },
});
