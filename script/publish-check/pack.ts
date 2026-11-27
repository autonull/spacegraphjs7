// Packs workspace packages with `npm pack` and extracts the tarballs into a consumer outside the
// repository, so every import resolves to published bytes instead of a workspace symlink. Runtime
// dependencies are symlinked from the library install to keep the check network-free.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const RUNTIME_DEPENDENCIES = [
    'solid-js',
    'three',
    'cytoscape',
    'gsap',
    'mitt',
    'onnxruntime-web',
    'three-mesh-bvh',
    'chart.js',
    'katex',
    '@monaco-editor/loader',
    'jsdom',
] as const;

export interface PackageRef {
    readonly name: string;
    readonly dir: string;
    /** Source-only packages (for example a scaffold) have no dist to require. */
    readonly requiresDist?: boolean;
}
const catalog = (root: string) => ({
    library: { name: 'spacegraphjs', dir: root },
    renderer: { name: '@spacegraphjs/renderer', dir: join(root, 'packages/renderer') },
    shared: { name: '@spacegraphjs/shared', dir: join(root, 'packages/shared') },
    kernel: { name: '@spacegraphjs/kernel', dir: join(root, 'packages/kernel') },
    adapter: { name: '@spacegraphjs/adapter', dir: join(root, 'packages/adapter') },
    spaceRenderer: {
        name: '@spacegraphjs/spacegraph-renderer',
        dir: join(root, 'packages/spacegraph-renderer'),
    },
    cytoscapeRenderer: {
        name: '@spacegraphjs/cytoscape-renderer',
        dir: join(root, 'packages/cytoscape-renderer'),
    },
    svgRenderer: { name: '@spacegraphjs/svg-renderer', dir: join(root, 'packages/svg-renderer') },
    workflow: { name: '@spacegraphjs/workflow', dir: join(root, 'packages/domain/workflow') },
    filesystem: { name: '@spacegraphjs/filesystem', dir: join(root, 'packages/domain/filesystem') },
    data: { name: '@spacegraphjs/data', dir: join(root, 'packages/domain/data') },
    agent: { name: '@spacegraphjs/agent', dir: join(root, 'packages/domain/agent') },
    source: { name: '@spacegraphjs/source', dir: join(root, 'packages/domain/source') },
    overlays: { name: '@spacegraphjs/overlays', dir: join(root, 'packages/overlays') },
    search: { name: '@spacegraphjs/search', dir: join(root, 'packages/search') },
    trace: { name: '@spacegraphjs/trace', dir: join(root, 'packages/trace') },
    config: { name: '@spacegraphjs/config', dir: join(root, 'packages/config') },
    create: { name: 'create-spacegraph', dir: join(root, 'packages/create-spacegraph') },
});
export type PackageKey = keyof ReturnType<typeof catalog>;
export const pickPackages = (
    root: string,
    keys: readonly PackageKey[],
    overrides: Partial<Record<PackageKey, Partial<PackageRef>>> = {},
): PackageRef[] => {
    const packages = catalog(root);
    return keys.map((key) => ({ ...packages[key], ...overrides[key] }));
};

export function createPackedConsumer(
    root: string,
    packages: readonly PackageRef[],
    runtimeDependencies: readonly string[],
    consumer: string,
    tarballs: string,
): void {
    mkdirSync(consumer, { recursive: true });
    mkdirSync(tarballs, { recursive: true });

    for (const pkg of packages) {
        if (pkg.requiresDist !== false && !existsSync(join(pkg.dir, 'dist'))) {
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
        execFileSync('tar', [
            '-xzf',
            join(tarballs, packed.filename),
            '-C',
            target,
            '--strip-components=1',
        ]);
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

    writeFileSync(
        join(consumer, 'package.json'),
        JSON.stringify({ name: 'spacegraph-consumer', private: true, type: 'module' }, null, 2),
    );
}
