import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'N8nBridge',
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'three',
        'three/examples/jsm/exporters/GLTFExporter.js',
        'spacegraphjs',
        'rxjs',
        'gsap',
        'yjs',
        'y-websocket',
      ],
    },
  },
});
