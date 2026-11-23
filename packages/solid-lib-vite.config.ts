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

/** The shared Vite build for a single-entry Solid package with a library name. */
export const solidSingleLibConfig = (name: string) =>
    defineConfig({
        plugins: [solid(), dts({ insertTypesEntry: true, tsconfigPath: './tsconfig.json' })],
        build: {
            lib: { entry: './src/index.ts', name, fileName: 'index', formats: ['es'] },
            rollupOptions: {
                external: ['solid-js'],
                output: { globals: { 'solid-js': 'Solid' } },
            },
        },
    });
