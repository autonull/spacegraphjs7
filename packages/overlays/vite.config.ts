import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import dts from 'vite-plugin-dts';

const sharedDist = resolve(__dirname, '../shared/dist');

// External function to match @spacegraphjs/shared and all its subpaths, including resolved file paths
function isExternal(id: string) {
    return (
        id === 'solid-js' ||
        id.startsWith('solid-js/') ||
        id === '@spacegraphjs/shared' ||
        id.startsWith('@spacegraphjs/shared/') ||
        id.includes('/packages/shared/src/') ||
        id.includes('/packages/shared/dist/')
    );
}

export default defineConfig({
    plugins: [solid({ ssr: true }), dts({ insertTypesEntry: true })],
    resolve: {
        alias: [
            { find: /^@spacegraphjs\/shared$/, replacement: resolve(sharedDist, 'index.js') },
            { find: /^@spacegraphjs\/shared\/(.+)$/, replacement: resolve(sharedDist, '$1.js') },
        ],
    },
    optimizeDeps: {
        exclude: ['@spacegraphjs/shared'],
    },
    build: {
        lib: {
            entry: {
                index: 'src/index.ts',
                GraphPeek: 'src/GraphPeek.tsx',
                GraphPopover: 'src/GraphPopover.tsx',
                GraphOverlayManager: 'src/GraphOverlayManager.tsx',
                ScopedOverlay: 'src/ScopedOverlay.tsx',
            },
            formats: ['es'],
            fileName: (format, entryName) => `${entryName}.js`,
        },
        outDir: 'dist',
        rollupOptions: {
            external: isExternal,
        },
    },
});
