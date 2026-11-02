import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [solid(), dts({ insertTypesEntry: true })],
    build: {
        lib: {
            entry: {
                index: 'src/index.ts',
                GraphShowControl: 'src/GraphShowControl.tsx',
                GraphDrawControl: 'src/GraphDrawControl.tsx',
                GraphZoomControl: 'src/GraphZoomControl.tsx',
                GraphStatusBar: 'src/GraphStatusBar.tsx',
                GraphQuestionsControl: 'src/GraphQuestionsControl.tsx',
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
