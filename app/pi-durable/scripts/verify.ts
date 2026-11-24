import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const workspace = resolve(root, '../..');
const failures: string[] = [];
const check = (condition: boolean, message: string): void => {
    if (!condition) failures.push(message);
};

const files = (dir: string): string[] =>
    readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((entry) => {
        try {
            return statSync(join(dir, entry)).isFile();
        } catch {
            return false;
        }
    });

for (const dir of [join(root, 'src'), join(root, 'tests'), join(root, 'scripts'), join(root, '../pi-kit/src')]) {
    for (const entry of files(dir)) {
        if (!entry.endsWith('.ts')) continue;
        const path = join(dir, entry);
        const text = readFileSync(path, 'utf8');
        const piImport = /from ['"]@earendil-works\//.test(text);
        if (path.endsWith('src/server.ts')) check(piImport, 'server.ts must import Pi Durable');
        else check(!piImport, `Pi import outside server.ts: ${path}`);
    }
}

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>;
};
for (const name of ['chord', 'pi-ai', 'pi-durable', 'pi-schema'])
    check(manifest.dependencies[`@earendil-works/${name}`] === '1.6.0', `${name} must pin 1.6.0`);

const allowlist = new Set([
    'docs/PLAN/SPACEGRAPH_OS.md',
    'docs/PLAN/INDEX.md',
    'docs/screenshots/README.md',
    'docs/adr/0017-one-owner-tabs-as-views.md',
    'docs/adr/0018-committed-state-is-truth.md',
]);
for (const entry of files(join(workspace, 'docs'))) {
    if (allowlist.has(`docs/${entry.replaceAll('\\', '/')}`)) continue;
    const text = readFileSync(join(workspace, 'docs', entry), 'utf8');
    check(!/@earendil-works|app\/pi-durable/.test(text), `pi reference in docs/${entry}`);
}

if (failures.length) {
    console.error(`pi-durable guard failed (${failures.length}):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
}
console.log('pi-durable guard passed');
