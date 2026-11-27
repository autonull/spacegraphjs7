import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname);
const workspace = resolve(root, '../..');
const source = (name: string) => resolve(workspace, 'packages', name, 'src/index.ts');

// Walk category folders explicitly; Node's recursive readdir would descend into node_modules.
const htmlFiles: string[] = [];
const walk = (dir: string, prefix = '') => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        const relative = `${prefix}${entry.name}`;
        if (entry.isDirectory()) walk(resolve(dir, entry.name), `${relative}/`);
        else if (entry.name.endsWith('.html')) htmlFiles.push(relative);
    }
};
walk(root);
const inputs = Object.fromEntries(
    htmlFiles.map((file) => [file.replace(/\.html$/, ''), resolve(root, file)]),
);

export default defineConfig({
    root,
    base: './',
    publicDir: resolve(workspace, 'public'),
    resolve: {
        alias: [
            { find: /^@src\/(.+)$/, replacement: resolve(workspace, 'src/$1') },
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
            {
                find: /^@spacegraphjs\/export$/,
                replacement: resolve(workspace, 'packages/export/src/export.ts'),
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
            {
                find: /^@spacegraphjs\/agent$/,
                replacement: resolve(workspace, 'packages/domain/agent/src/index.ts'),
            },
            {
                find: /^@spacegraphjs\/workflow$/,
                replacement: resolve(workspace, 'packages/domain/workflow/src/index.ts'),
            },
            {
                find: /^@spacegraphjs\/filesystem$/,
                replacement: resolve(workspace, 'packages/domain/filesystem/src/index.ts'),
            },
            {
                find: /^@spacegraphjs\/data$/,
                replacement: resolve(workspace, 'packages/domain/data/src/index.ts'),
            },
            {
                find: /^@spacegraphjs\/source$/,
                replacement: resolve(workspace, 'packages/domain/source/src/index.ts'),
            },
        ],
    },
    server: {
        port: 5173,
        open: false,
        fs: { allow: [workspace] },
    },
    build: {
        outDir: resolve(workspace, 'dist-demo'),
        emptyOutDir: true,
        rollupOptions: {
            input: inputs,
            output: {
                manualChunks(id) {
                    if (id.includes('three')) return 'three';
                    if (id.includes('@monaco-editor/loader')) return 'monaco';
                },
            },
        },
    },
});
