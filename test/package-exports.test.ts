// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIBRARY_ENTRIES } from '../script/library-entries';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

const LEAF_PACKAGES = [
  'renderer',
  'adapter',
  'spacegraph-renderer',
  'cytoscape-renderer',
  'svg-renderer',
  'kernel',
];

describe('published surface', () => {
  it('publishes every entry as source, declarations and bundle', () => {
    const manifest = read(resolve(root, 'package.json'));
    expect(Object.keys(manifest.exports)).toEqual(LIBRARY_ENTRIES.map((entry) => entry.subpath));

    for (const entry of LIBRARY_ENTRIES) {
      expect(manifest.exports[entry.subpath]).toEqual({
        types: `./${entry.types}`,
        import: `./dist/${entry.name}.js`,
        default: `./dist/${entry.name}.js`,
      });
    }
  });

  it('publishes the leaf packages the same way', () => {
    for (const name of LEAF_PACKAGES) {
      const manifest = read(resolve(root, 'packages', name, 'package.json'));
      expect(manifest.exports['.']).toEqual({
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js',
      });
      expect(manifest.types).toBe('./dist/index.d.ts');
    }
  });

  it('ships the build, not the source', () => {
    const manifest = read(resolve(root, 'package.json'));
    expect(manifest.files).toContain('dist');
    expect(manifest.files).not.toContain('src');
  });

  // The build artifacts only exist after a build, so this runs when there is one to check.
  describe.skipIf(!existsSync(resolve(root, 'dist/index.js')))('build artifacts', () => {
    it('has a bundle and a declaration for every published subpath', () => {
      const manifest = read(resolve(root, 'package.json'));
      for (const entry of LIBRARY_ENTRIES) {
        for (const target of [entry.types, `dist/${entry.name}.js`]) {
          expect(existsSync(resolve(root, target)), `${target} is missing`).toBe(true);
        }
        expect(manifest.exports[entry.subpath].types).toBe(`./${entry.types}`);
      }
    });

    it('has a bundle and a declaration for every leaf package', () => {
      for (const name of LEAF_PACKAGES) {
        expect(existsSync(resolve(root, 'packages', name, 'dist/index.js')), `${name} bundle`).toBe(true);
        expect(existsSync(resolve(root, 'packages', name, 'dist/index.d.ts')), `${name} types`).toBe(true);
      }
    });

    it('no longer ships the hand-written activity declarations', () => {
      expect(existsSync(resolve(root, 'types/activity.d.ts'))).toBe(false);
    });
  });
});
