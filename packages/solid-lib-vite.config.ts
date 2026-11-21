import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import dts from 'vite-plugin-dts';

/** The shared Vite build for a Solid package with multiple entry points. */
export const solidLibConfig = (entry: Record<string, string>, external: (string | RegExp)[]) =>
    defineConfig({
        plugins: [solid(), dts({ insertTypesEntry: true })],
        build: {
            lib: {
                entry,
                formats: ['es'],
                fileName: (_format, entryName) => `${entryName}.js`,
            },
            outDir: 'dist',
            rollupOptions: { external },
        },
    });
