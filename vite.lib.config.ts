import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { LIBRARY_ENTRIES } from './script/library-entries.ts';

export default defineConfig({
  build: {
    lib: {
      // One bundle per export subpath, so a consumer can import `spacegraphjs/layout` without pulling
      // the whole library. Shared code lands in common chunks that the entries import relatively.
      entry: Object.fromEntries(
        LIBRARY_ENTRIES.map((entry) => [entry.name, resolve(import.meta.dirname, entry.source)]),
      ),
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'three',
        'gsap',
        'mitt',
        'onnxruntime-web',
        'three-mesh-bvh',
        'chart.js',
        'katex',
        'marked',
        '@monaco-editor/loader',
      ],
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
  // @ts-expect-error
  plugins: [
    dts({ insertTypesEntry: true, exclude: ['test/**', 'demo/**', 'script/**'], skipDiagnostics: true }),
  ],
});
