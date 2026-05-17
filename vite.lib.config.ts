import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'SpaceGraph',
            fileName: (format) => `spacegraphjs.${format === 'es' ? 'js' : 'cjs'}`,
            formats: ['es', 'cjs'],
        },
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            external: ['three', 'gsap', 'mitt', 'onnxruntime-web', 'three-mesh-bvh', 'chart.js', 'katex', 'marked'],
            output: {
                globals: {
                    three: 'THREE',
                    gsap: 'gsap',
                    mitt: 'mitt',
                    'onnxruntime-web': 'ort',
                    'three-mesh-bvh': 'ThreeMeshBVH',
                },
            },
        },
    },
    // @ts-ignore
    plugins: [dts({ insertTypesEntry: true, exclude: ["test/**", "demo/**"], skipDiagnostics: true })],
});
