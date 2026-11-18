// Packs workspace packages with `npm pack` and extracts the tarballs into a consumer outside the
// repository, so every import resolves to published bytes instead of a workspace symlink. Runtime
// dependencies are symlinked from the library install to keep the check network-free.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface PackageRef {
    readonly name: string;
    readonly dir: string;
}

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
