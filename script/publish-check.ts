// Proves the published packages are consumable outside the monorepo.
//
// The check is network-free and uses the bytes npm would install: each package is packed with
// `npm pack`, the tarball is extracted into a consumer's `node_modules`, and the consumer runs
// against that. Nothing in the consumer resolves to the workspace.
//
// Two checks run:
//   - a node check that imports the contract, the model adapter and both interactive adapters, and
//     mounts the Cytoscape adapter into a jsdom container;
//   - a browser check that mounts both interactive adapters for real and reports what they drew.
//
// The consumer lives outside the repository, so a workspace link cannot satisfy an import by accident.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packages = [
  { name: 'spacegraphjs', dir: root },
  { name: '@spacegraphjs/renderer', dir: join(root, 'packages/renderer') },
  { name: '@spacegraphjs/adapter', dir: join(root, 'packages/adapter') },
  { name: '@spacegraphjs/spacegraph-renderer', dir: join(root, 'packages/spacegraph-renderer') },
  { name: '@spacegraphjs/cytoscape-renderer', dir: join(root, 'packages/cytoscape-renderer') },
  { name: '@spacegraphjs/svg-renderer', dir: join(root, 'packages/svg-renderer') },
];

// The packages' runtime dependencies are not part of the tarball; the consumer resolves them from the
// library's install so the check needs no network.
const runtimeDependencies = [
  'three',
  'cytoscape',
  'gsap',
  'mitt',
  'onnxruntime-web',
  'three-mesh-bvh',
  'chart.js',
  'katex',
  'marked',
  '@monaco-editor/loader',
  'jsdom',
];

const workspace = mkdtempSync(join(tmpdir(), 'spacegraph-publish-'));
const consumer = join(workspace, 'consumer');
const tarballs = join(workspace, 'tarballs');

try {
  mkdirSync(consumer, { recursive: true });
  mkdirSync(tarballs, { recursive: true });

  for (const pkg of packages) {
    if (!existsSync(join(pkg.dir, 'dist'))) {
      throw new Error(`${pkg.name} has no dist; run the build first`);
    }
    const output = execFileSync('npm', ['pack', '--json', '--pack-destination', tarballs], {
      cwd: pkg.dir,
      encoding: 'utf8',
    });
    const parsed = JSON.parse(output);
    // npm 11 reports an object keyed by package name; older versions report an array.
    const packed = Array.isArray(parsed) ? parsed[0] : parsed[pkg.name];
    if (!packed?.filename) throw new Error(`npm pack reported no tarball for ${pkg.name}`);
    const target = join(consumer, 'node_modules', pkg.name);
    mkdirSync(target, { recursive: true });
    execFileSync('tar', ['-xzf', join(tarballs, packed.filename), '-C', target, '--strip-components=1']);
    console.log(`packed ${pkg.name} (${packed.filename})`);
  }

  for (const dependency of runtimeDependencies) {
    // The dependency may be installed at the workspace root or inside the package that declares it.
    const source = [
      join(root, 'node_modules', dependency),
      ...packages.map((pkg) => join(pkg.dir, 'node_modules', dependency)),
    ].find((candidate) => existsSync(candidate));
    if (!source) continue;
    const target = join(consumer, 'node_modules', dependency);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(source, target, 'dir');
  }

  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'spacegraph-consumer', private: true, type: 'module' }, null, 2));
  writeFileSync(join(consumer, 'check.ts'), readFileSync(resolve(import.meta.dirname, 'publish-check/consumer/check.ts')));
  writeFileSync(join(consumer, 'browser.html'), readFileSync(resolve(import.meta.dirname, 'publish-check/consumer/browser.html')));
  writeFileSync(join(consumer, 'browser.ts'), readFileSync(resolve(import.meta.dirname, 'publish-check/consumer/browser.ts')));

  console.log('\nnode check: the published contract and adapters');
  execFileSync('bun', ['run', 'check.ts'], { cwd: consumer, stdio: 'inherit' });

  console.log('\nbrowser check: both interactive adapters mount and draw');
  execFileSync('bun', ['run', resolve(import.meta.dirname, 'publish-check/consumer/browser-check.ts')], {
    cwd: consumer,
    stdio: 'inherit',
    env: { ...process.env, CONSUMER_ROOT: consumer },
  });

  console.log('\npublish check passed');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
