import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            formats: ['es'],
            fileName: () => 'index.js',
        },
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: [
                'spacegraphjs',
                /^spacegraphjs\//,
                /^@spacegraphjs\//,
            ],
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
