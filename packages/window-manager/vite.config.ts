import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import solid from 'vite-plugin-solid';

export default defineConfig({
    plugins: [solid(), dts({ insertTypesEntry: true, tsconfigPath: './tsconfig.json' })],
    build: {
        lib: {
            entry: './src/index.ts',
            name: 'WindowManager',
            fileName: 'index',
            formats: ['es'],
        },
        rollupOptions: {
            external: ['solid-js'],
            output: {
                globals: { 'solid-js': 'Solid' },
            },
        },
    },
});
