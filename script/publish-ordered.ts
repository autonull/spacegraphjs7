// P6.3 — publishes workspace packages in dependency order, so a package never reaches the registry
// before the packages it imports. Dry-run by default; set SG_PUBLISH=1 to perform a real upload.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface Package {
    name: string;
    dir: string;
    deps: string[];
}

const root = resolve(import.meta.dirname, '..');
const dirs = [root, ...readdirSync(join(root, 'packages')).map((name) => join(root, 'packages', name))];
const packages: Package[] = dirs
    .filter((dir) => existsSync(join(dir, 'package.json')))
    .map((dir) => {
        const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
        const deps = {
            ...manifest.dependencies,
            ...manifest.optionalDependencies,
            ...manifest.peerDependencies,
        };
        return {
            name: manifest.name,
            dir,
            deps: Object.keys(deps).filter((name) =>
                name === 'spacegraphjs' || name.startsWith('@spacegraphjs/'),
            ),
        };
    });

const names = new Set(packages.map((pkg) => pkg.name));
const remaining = new Map(packages.map((pkg) => [pkg.name, pkg.deps.filter((dep) => names.has(dep))]));
const order: string[] = [];
while (remaining.size) {
    const ready = [...remaining].find(([, deps]) => deps.every((dep) => !remaining.has(dep)));
    if (!ready) throw new Error(`dependency cycle among: ${[...remaining.keys()].join(', ')}`);
    order.push(ready[0]);
    remaining.delete(ready[0]);
}

console.log(`publish order:\n${order.map((name, index) => `  ${index + 1}. ${name}`).join('\n')}`);
if (process.env.SG_PUBLISH_PLAN === '1') process.exit(0);

const publish = process.env.SG_PUBLISH === '1';
const args = publish
    ? ['publish', '--access', 'public', '--no-git-checks']
    : ['publish', '--dry-run', '--access', 'public', '--no-git-checks', '--ignore-scripts'];
for (const name of order) {
    const dir = packages.find((pkg) => pkg.name === name)!.dir;
    console.log(`\n${publish ? 'publishing' : 'checking'} ${name}`);
    execFileSync('pnpm', args, { cwd: dir, stdio: 'inherit' });
}
console.log(publish ? '\nordered upload complete' : '\nordered publish check passed');
