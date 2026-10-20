// Rewrites the `exports` map of the root package from the entry list, and the same for the leaf packages.
//
// Every subpath resolves two ways:
//   - `types` → the generated declaration under `dist/`,
//   - `import`→ the bundle under `dist/`.
//
// The published package is the bundle, never the source: a consumer installs the same bytes the
// library publishes, and the source stays out of the tarball.
//
// `test/package-exports.test.ts` asserts the committed manifest matches what this script writes, so a
// subpath cannot be published without a build artifact behind it.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LIBRARY_ENTRIES } from './library-entries';

const root = resolve(import.meta.dirname, '..');

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

const rootManifestPath = resolve(root, 'package.json');
const rootManifest = read(rootManifestPath);
rootManifest.exports = Object.fromEntries(
  LIBRARY_ENTRIES.map((entry) => [
    entry.subpath,
    {
      types: `./${entry.types}`,
      import: `./dist/${entry.name}.js`,
      default: `./dist/${entry.name}.js`,
    },
  ]),
);
rootManifest.main = './dist/index.js';
rootManifest.module = './dist/index.js';
rootManifest.types = './dist/index.d.ts';
rootManifest.files = ['dist', 'README.md', 'LICENSE'];
writeFileSync(rootManifestPath, `${JSON.stringify(rootManifest, null, 2)}\n`);

for (const name of ['renderer', 'adapter', 'spacegraph-renderer', 'cytoscape-renderer', 'svg-renderer']) {
  const manifestPath = resolve(root, 'packages', name, 'package.json');
  const manifest = read(manifestPath);
  manifest.main = './dist/index.js';
  manifest.module = './dist/index.js';
  manifest.types = './dist/index.d.ts';
  manifest.exports = {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      default: './dist/index.js',
    },
  };
  manifest.files = ['dist', 'README.md'];
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log('wrote the exports maps');
