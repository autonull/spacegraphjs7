// Every `pnpm …` in the quickstart and the README must name a real workspace script or package.
// A guide cannot rot silently when a script is renamed.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const scripts = (relative: string): string[] => {
    const path = resolve(root, relative);
    if (!existsSync(path)) return [];
    return Object.keys(JSON.parse(readFileSync(path, 'utf8')).scripts ?? {});
};

const directories = ['packages', 'packages/domain', 'app'].flatMap((parent) => {
    const path = resolve(root, parent);
    return existsSync(path)
        ? execFileSync('find', [path, '-mindepth', '1', '-maxdepth', '1', '-type', 'd'], {
              encoding: 'utf8',
          })
              .trim()
              .split('\n')
              .filter(Boolean)
              .map((dir) => dir.slice(root.length + 1))
              .filter((dir) => existsSync(resolve(root, dir, 'package.json')))
        : [];
});
const manifests = new Map(
    ['package.json', ...directories.map((dir) => join(dir, 'package.json'))].map((path) => {
        const manifest = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
        return [manifest.name as string, new Set(scripts(path))];
    }),
);
const knownPackages = new Set(manifests.keys());
const failures: string[] = [];
const builtins = new Set(['install', 'add', 'exec', 'init', 'create', 'dlx', 'run']);

for (const doc of ['docs/QUICKSTART.md', 'README.md']) {
    const lines = readFileSync(resolve(root, doc), 'utf8').split('\n');
    lines.forEach((line, index) => {
        const command = line.trim().split('#')[0].trim();
        if (!command.startsWith('pnpm ')) return;
        const args = command.split(/\s+/).slice(1);
        if (args[0] === '--filter') {
            const pkg = manifests.get(args[1]);
            const script = args[2] === 'run' ? args[3] : args[2];
            if (!pkg) failures.push(`${doc}:${index + 1}: unknown workspace package ${args[1]}`);
            else if (!pkg.has(script)) failures.push(`${doc}:${index + 1}: ${args[1]} has no ${script} script`);
            return;
        }
        if (args[0] === 'dlx' || args[0] === 'create') {
            const name = args[1].replace(/@[^/]+$/, '').replace(/-y$/, '');
            const bin = args[0] === 'create' ? `create-${name}` : name;
            if (!knownPackages.has(bin)) failures.push(`${doc}:${index + 1}: ${bin} is not a workspace package`);
            return;
        }
        if (builtins.has(args[0])) {
            if (args[0] === 'run' && !manifests.get('spacegraphjs')?.has(args[1])) {
                failures.push(`${doc}:${index + 1}: root has no ${args[1]} script`);
            }
            return;
        }
        if (!manifests.get('spacegraphjs')?.has(args[0])) {
            failures.push(`${doc}:${index + 1}: root has no ${args[0]} script`);
        }
    });
}

if (failures.length) throw new Error(`docs command lint failed:\n  ${failures.join('\n  ')}`);
console.log('docs command lint passed: every documented pnpm command resolves');
