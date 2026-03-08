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
                'n8n',
                'n8n-core',
                'better-sqlite3',
                'three',
                'three/examples/jsm/renderers/CSS3DRenderer.js',
                'three/examples/jsm/renderers/CSS2DRenderer.js',
                'three/examples/jsm/loaders/GLTFLoader.js',
                'chart.js',
                'chart.js/auto',
                'gsap',
                'marked',
                'katex',
                'mitt',
                'onnxruntime-web',
                'three-mesh-bvh',
                'child_process',
                'fs',
                'path',
                'playwright',
                '@playwright/test',
                'http-server',
                'url',
                'http',
                'https',
                'http2',
                'crypto',
                'os'
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
    resolve: {
        alias: {
            'n8n/core': resolve(__dirname, 'node_modules/n8n/packages/core/dist'),
            'n8n/workflow': resolve(__dirname, 'node_modules/n8n-workflow/dist'),
        },
    },
});
