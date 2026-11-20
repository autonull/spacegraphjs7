import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const workspace = resolve(import.meta.dirname, '../../..');
const failures: string[] = [];
const check = (ok: boolean, message: string): void => {
    if (!ok) failures.push(message);
};

const sources = (dir: string): string[] =>
    readdirSync(dir, { recursive: true, encoding: 'utf8' })
        .filter((entry) => /\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry))
        .map((entry) => readFileSync(join(dir, entry), 'utf8'));

const libraryDirs = [
    resolve(workspace, 'src'),
    ...['packages', 'packages/domain'].flatMap((parent) => {
        const base = resolve(workspace, parent);
        return readdirSync(base, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => join(base, entry.name, 'src'))
            .filter((dir) => {
                try {
                    return readdirSync(dir).length > 0;
                } catch {
                    return false;
                }
            });
    }),
];

const isForbidden = (text: string): boolean =>
    /@earendil-works|(?:from\s+['"]|\bimport\(['"])(?:pi|app\/pi|\.\/pi|\.\.\/pi)['"]/.test(text);
for (const dir of libraryDirs) {
    for (const source of sources(dir)) check(!isForbidden(source), `pi reference in ${dir}`);
}

for (const file of ['package.json', 'vite.config.ts', 'app/demo/vite.config.ts', 'vite.lib.config.ts']) {
    const text = readFileSync(resolve(workspace, file), 'utf8');
    check(!/@earendil-works|["']pi["']/.test(text), `pi reference in ${file}`);
}

const docs = resolve(workspace, 'docs');
for (const entry of readdirSync(docs, { recursive: true, encoding: 'utf8' }).filter((path) =>
    statSync(join(docs, path)).isFile(),
)) {
    const text = readFileSync(join(docs, entry), 'utf8');
    check(!/app\/pi|@earendil-works/.test(text), `pi reference in docs/${entry}`);
}

const packageManifests = (): { name: string; dir: string; manifest: Record<string, unknown> }[] => {
    const read = (dir: string) => ({
        dir,
        manifest: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Record<string, unknown>,
    });
    const parent = (name: string) =>
        readdirSync(resolve(workspace, name), { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .filter((entry) => {
                try {
                    return statSync(resolve(workspace, name, entry.name, 'package.json')).isFile();
                } catch {
                    return false;
                }
            })
            .map((entry) => read(resolve(workspace, name, entry.name)))
            .filter((entry) => (entry.manifest.name as string)?.startsWith('@spacegraphjs/'));
    return [read(workspace), ...parent('packages'), ...parent('packages/domain')].map((entry) => ({
        name: entry.manifest.name as string,
        dir: entry.dir,
        manifest: entry.manifest,
    }));
};

const manifests = packageManifests();
const published = new Set(manifests.map((entry) => entry.name));
for (const { name, manifest } of manifests) {
    const deps = {
        ...((manifest.dependencies ?? {}) as Record<string, string>),
        ...((manifest.peerDependencies ?? {}) as Record<string, string>),
    };
    check(!('pi' in deps), `${name} depends on the pi app`);
    for (const dependency of Object.keys(deps)) {
        check(!dependency.startsWith('@earendil-works/'), `${name} depends on ${dependency}`);
        check(
            !dependency.startsWith('@spacegraphjs/') || published.has(dependency),
            `${name} depends on unpublished ${dependency}`,
        );
    }
}

if (failures.length) {
    console.error(`one-way dependency guard failed (${failures.length}):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
}
console.log(`one-way dependency guard passed (${published.size} published packages checked)`);
