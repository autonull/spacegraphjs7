import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: { index: 'src/index.ts', library: 'src/library.ts' },
            formats: ['es'],
            fileName: (_format, entryName) => `${entryName}.js`,
        },
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: [/^@spacegraphjs\//, /^spacegraphjs(\/.*)?$/],
        },
    },
    plugins: [
        dts({
            include: ['src'],
            exclude: ['src/**/*.test.ts'],
            outDir: 'dist',
            entryRoot: 'src',
            skipDiagnostics: true,
        }),
    ],
});
