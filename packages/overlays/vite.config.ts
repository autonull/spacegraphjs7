import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [solid(), dts({ insertTypesEntry: true })],
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
            external: ['solid-js', '@spacegraphjs/shared'],
        },
    },
});
