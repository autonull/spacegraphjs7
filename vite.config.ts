import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: 'demo',
    publicDir: '../public',
    resolve: {
        alias: {
            '@src': resolve(__dirname, 'src'),
        },
    },
    server: {
        port: 5173,
        open: false,
    },
    build: {
        target: 'esnext',
        outDir: '../dist-demo',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ['three'],
                    monaco: ['@monaco-editor/loader'],
                },
            },
        },
    },
});
