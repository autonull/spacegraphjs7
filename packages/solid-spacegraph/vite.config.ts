import { defineConfig } from 'vite';
import { resolve } from 'path';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
    plugins: [solidPlugin()],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.tsx'),
            name: 'SolidSpaceGraph',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
        },
        rollupOptions: {
            external: ['solid-js', 'solid-js/web', 'spacegraphjs'],
            output: {
                globals: {
                    'solid-js': 'Solid',
                    'solid-js/web': 'SolidWeb',
                    spacegraphjs: 'SpaceGraphJS',
                },
            },
        },
        sourcemap: true,
        minify: true,
    },
});
