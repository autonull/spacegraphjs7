// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// L1.34: enforce the dependency direction from §4.1. The core stays pure, the contract has no
// runtime dependencies, and the adapters stay leaves.
// Type-only imports from @spacegraphjs/renderer are allowed in core (shared contract types).

const root = resolve(__dirname, '..');
const STATIC_IMPORT = /(?:^|\n)\s*import\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g;

function staticImportsIn(dir: string): string[] {
  const base = resolve(root, dir);
  return readdirSync(base, { recursive: true, encoding: 'utf8' })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry))
    .flatMap((entry) =>
      [...readFileSync(resolve(base, entry), 'utf8').matchAll(STATIC_IMPORT)].map((m) => m[1]!)
    );
}

const CORE_FORBIDDEN = [
  '@spacegraphjs/spacegraph-renderer',
  '@spacegraphjs/cytoscape-renderer',
  '@spacegraphjs/svg-renderer',
  'cytoscape',
];

// @spacegraphjs/renderer type-only imports are allowed in core
function hasRuntimeImport(specifier: string, content: string): boolean {
  const importRegex = new RegExp(`import\\s+(?:[^\\n]*?\\s)?from\\s*['"]${specifier}['"]`, 'g');
  const match = content.match(importRegex);
  // If there's no 'import type' prefix, it's a runtime import
  return match?.some((m) => !m.includes('import type')) ?? false;
}

describe('package boundaries', () => {
  it('keeps the core free of the contract, adapters, and Cytoscape', () => {
    const coreImports = staticImportsIn('src');
    for (const specifier of CORE_FORBIDDEN) {
      expect(coreImports).not.toContain(specifier);
    }
    // @spacegraphjs/renderer type-only imports are allowed; check no runtime imports
    const rendererImportContent = readdirSync(resolve(root, 'src'), { recursive: true, encoding: 'utf8' })
      .filter((entry) => /\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry))
      .flatMap((entry) => readFileSync(resolve(root, 'src', entry), 'utf8'))
      .join('\n');
    expect(hasRuntimeImport('@spacegraphjs/renderer', rendererImportContent)).toBe(false);
  });

  it('keeps the contract dependency-free', () => {
    // The contract may use its own modules; it may not reach for a package or a bare specifier.
    expect(
      staticImportsIn('packages/renderer/src').filter((specifier) => !specifier.startsWith('.')),
    ).toEqual([]);
  });

  it('keeps the kernel dependency-free', () => {
    expect(
      staticImportsIn('packages/kernel/src').filter((specifier) => !specifier.startsWith('.')),
    ).toEqual([]);
  });

  it('keeps the Cytoscape adapter off the core', () => {
    for (const specifier of ['spacegraphjs', 'spacegraphjs/core', 'spacegraphjs/activity']) {
      expect(staticImportsIn('packages/cytoscape-renderer/src')).not.toContain(specifier);
    }
  });

  it('keeps the SVG renderer on the contract only', () => {
    for (const specifier of ['spacegraphjs', 'spacegraphjs/core', 'spacegraphjs/activity', 'cytoscape']) {
      expect(staticImportsIn('packages/svg-renderer/src')).not.toContain(specifier);
    }
  });

  it('keeps the model adapter on the contract only', () => {
    const imports = staticImportsIn('packages/adapter/src');
    expect(imports).toContain('@spacegraphjs/renderer');
    for (const specifier of ['spacegraphjs', 'spacegraphjs/core', 'spacegraphjs/activity', 'cytoscape']) {
      expect(imports).not.toContain(specifier);
    }
  });

  it('only the SpaceGraph adapter imports the core and the contract together', () => {
    const imports = staticImportsIn('packages/spacegraph-renderer/src');
    expect(imports).toContain('@spacegraphjs/renderer');
    expect(imports).toContain('spacegraphjs/activity');
  });

  it('keeps the framework bindings on the contract and the controller, not core internals', () => {
    for (const dir of ['packages/react-spacegraph/src', 'packages/solid-spacegraph/src']) {
      const imports = staticImportsIn(dir);
      expect(imports).toContain('@spacegraphjs/renderer');
      expect(imports).toContain('spacegraphjs/control');
      for (const specifier of ['spacegraphjs', 'spacegraphjs/core', 'spacegraphjs/activity']) {
        expect(imports).not.toContain(specifier);
      }
    }
  });
});
