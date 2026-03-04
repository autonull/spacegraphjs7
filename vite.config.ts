import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: {
                spacegraphjs: resolve(__dirname, 'src/index.ts'),
                vision: resolve(__dirname, 'src/vision/index.ts'),
                'vision-test': resolve(__dirname, 'src/vision/vision-test.ts'),
            },
            name: 'SpaceGraphJS',
            formats: ['es', 'cjs'],
        },
        rollupOptions: {
            external: [
                'three',
                'chart.js',
                'gsap',
                'marked',
                'mitt',
                'onnxruntime-web',
                'three-mesh-bvh',
                'child_process',
                'fs',
                'path',
                'playwright',
                'http-server',
            ],
            output: {
                globals: {
                    three: 'THREE',
                },
            },
        },
        sourcemap: true,
        minify: true, // Enable minification to test bundle sizes
    },
    server: {
        port: 5173,
        open: false, // Don't auto-open
    },
    root: '.', // Serve from project root
    publicDir: 'public', // Static assets
});
