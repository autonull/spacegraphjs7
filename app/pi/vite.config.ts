import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname);
const workspace = resolve(root, '../..');
const server = process.env.PI_SERVER_PORT ?? '8787';

export default defineConfig({
    root,
    resolve: {
        dedupe: ['three'],
        alias: [
            { find: /^spacegraphjs$/, replacement: resolve(workspace, 'src/index.ts') },
            {
                find: /^spacegraphjs\/layout-registry$/,
                replacement: resolve(workspace, 'src/core/layout-registry.ts'),
            },
            { find: /^spacegraphjs\/(.+)$/, replacement: resolve(workspace, 'src/$1') },
            { find: /^pi-kit$/, replacement: resolve(root, '../pi-kit/src/index.ts') },
            {
                find: /^pi-kit\/(.+)$/,
                replacement: resolve(root, '../pi-kit/src/$1.ts'),
            },
            {
                find: /^@spacegraphjs\/config\/library$/,
                replacement: resolve(workspace, 'packages/config/src/library.ts'),
            },
            {
                find: /^@spacegraphjs\/navigation\/follow$/,
                replacement: resolve(workspace, 'packages/navigation/src/follow.ts'),
            },
            ...[
                ['adapter', 'adapter'],
                ['agent', 'domain/agent'],
                ['config', 'config'],
                ['kernel', 'kernel'],
                ['renderer', 'renderer'],
                ['spacegraph-renderer', 'spacegraph-renderer'],
            ].map(([name, dir]) => ({
                find: new RegExp(`^@spacegraphjs/${name}$`),
                replacement: resolve(workspace, 'packages', dir, 'src/index.ts'),
            })),
        ],
    },
    server: {
        port: 5175,
        proxy: {
            '/events': { target: `http://127.0.0.1:${server}`, changeOrigin: false },
            '/prompt': { target: `http://127.0.0.1:${server}`, changeOrigin: false },
        },
    },
    build: {
        outDir: resolve(root, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(root, 'index.html'),
                engine: resolve(root, 'engine.html'),
                study: resolve(root, 'study.html'),
            },
        },
    },
});
