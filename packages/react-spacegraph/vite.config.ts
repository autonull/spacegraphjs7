import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'ReactSpaceGraph',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'spacegraphjs'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          spacegraphjs: 'SpaceGraphJS',
        },
      },
    },
    sourcemap: true,
    minify: true,
  },
});
