// Builds the leaf packages under `packages/` into `dist/` (ESM + declarations).
//
// The packages are small and each has one entry, so they are built with the Vite API rather than a
// config file per package. The contract stays dependency-free and the adapters keep the core and the
// contract external, so a consumer resolves one copy of each.
import { resolve } from 'node:path';
import { access, constants } from 'node:fs/promises';
import { build } from 'vite';
import dts from 'vite-plugin-dts';

const PACKAGES = [
    'shared',
    'renderer',
    'adapter',
    'config',
    'spacegraph-renderer',
    'cytoscape-renderer',
    'svg-renderer',
    'kernel',
    'trace',
    'search',
    'overlays',
];

const EXTERNAL = [
    'three',
    'gsap',
    'mitt',
    'onnxruntime-web',
    'three-mesh-bvh',
    'chart.js',
    'katex',
    'cytoscape',
    '@monaco-editor/loader',
];

// The core and the contract stay external, subpaths included, so a consumer resolves one copy of each.
const isExternal = (id: string) =>
    EXTERNAL.includes(id) ||
    id === 'spacegraphjs' ||
    id.startsWith('spacegraphjs/') ||
    id.startsWith('@spacegraphjs/');

async function hasConfigFile(root: string): Promise<boolean> {
    try {
        await access(resolve(root, 'vite.config.ts'), constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

for (const name of PACKAGES) {
    const root = resolve(import.meta.dirname, '..', 'packages', name);
    const hasConfig = await hasConfigFile(root);

    await build({
        configFile: hasConfig ? resolve(root, 'vite.config.ts') : false,
        root,
        logLevel: 'warn',
        build: hasConfig
            ? undefined
            : {
                  lib: {
                      entry: resolve(root, 'src/index.ts'),
                      formats: ['es'],
                      fileName: () => 'index.js',
                  },
                  outDir: resolve(root, 'dist'),
                  emptyOutDir: true,
                  rollupOptions: { external: isExternal },
              },
        plugins: hasConfig
            ? undefined
            : [
                  dts({
                      include: [resolve(root, 'src')],
                      exclude: [resolve(root, 'src/**/*.test.ts')],
                      outDir: resolve(root, 'dist'),
                      entryRoot: resolve(root, 'src'),
                      skipDiagnostics: true,
                  }),
              ],
    });
    console.log(`built packages/${name}`);
}
