import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname);
const workspace = resolve(root, '../..');
const source = (name: string) => resolve(workspace, 'packages', name, 'src/index.ts');

export default defineConfig({
    root,
    publicDir: resolve(workspace, 'public'),
    resolve: {
        alias: [
            { find: /^spacegraphjs$/, replacement: resolve(workspace, 'src/index.ts') },
            {
                find: /^spacegraphjs\/layout-registry$/,
                replacement: resolve(workspace, 'src/core/layout-registry.ts'),
            },
            { find: /^spacegraphjs\/(.+)$/, replacement: resolve(workspace, 'src/$1') },
            {
                find: /^@spacegraphjs\/config\/library$/,
                replacement: resolve(workspace, 'packages/config/src/library.ts'),
            },
            {
                find: /^@spacegraphjs\/overlays$/,
                replacement: resolve(workspace, 'packages/overlays/dist/index.js'),
            },
            {
                find: /^@spacegraphjs\/search$/,
                replacement: resolve(workspace, 'packages/search/dist/index.js'),
            },
            ...[
                'adapter',
                'config',
                'cytoscape-renderer',
                'kernel',
                'renderer',
                'spacegraph-renderer',
                'svg-renderer',
                'trace',
            ].map((name) => ({
                find: new RegExp(`^@spacegraphjs/${name}$`),
                replacement: source(name),
            })),
        ],
    },
    build: {
        outDir: resolve(workspace, 'dist-demo/demo'),
        emptyOutDir: true,
    },
});
