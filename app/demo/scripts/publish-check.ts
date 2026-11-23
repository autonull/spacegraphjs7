// P6.3 — the flagship proof. Runs the framework-free demo host against published tarballs:
// every package the demo imports is packed, extracted into an external consumer and served with a
// Vite config that has no source aliases. The browser check drives the real demo page, so a stale
// workspace link cannot satisfy an import by accident.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createPackedConsumer, RUNTIME_DEPENDENCIES } from '../../../script/publish-check/pack.js';

const root = resolve(import.meta.dirname, '../../..');
const packages = [
    { name: 'spacegraphjs', dir: root },
    { name: '@spacegraphjs/adapter', dir: join(root, 'packages/adapter') },
    { name: '@spacegraphjs/cytoscape-renderer', dir: join(root, 'packages/cytoscape-renderer') },
    { name: '@spacegraphjs/kernel', dir: join(root, 'packages/kernel') },
    { name: '@spacegraphjs/overlays', dir: join(root, 'packages/overlays') },
    { name: '@spacegraphjs/renderer', dir: join(root, 'packages/renderer') },
    { name: '@spacegraphjs/search', dir: join(root, 'packages/search') },
    { name: '@spacegraphjs/shared', dir: join(root, 'packages/shared') },
    { name: '@spacegraphjs/spacegraph-renderer', dir: join(root, 'packages/spacegraph-renderer') },
    { name: '@spacegraphjs/svg-renderer', dir: join(root, 'packages/svg-renderer') },
    { name: '@spacegraphjs/trace', dir: join(root, 'packages/trace') },
];

const workspace = mkdtempSync(join(tmpdir(), 'spacegraph-demo-'));
const consumer = join(workspace, 'consumer');

try {
    createPackedConsumer(root, packages, RUNTIME_DEPENDENCIES, consumer, join(workspace, 'tarballs'));

    const demo = join(consumer, 'demo', 'src');
    mkdirSync(demo, { recursive: true });
    for (const file of readdirSync(join(root, 'app/demo/src'))) {
        copyFileSync(join(root, 'app/demo/src', file), join(demo, file));
    }
    copyFileSync(join(root, 'app/demo/index.html'), join(consumer, 'demo.html'));

    console.log('\ndemo check: the demo mounts and runs on published packages');
    execFileSync(
        'bun',
        ['run', resolve(import.meta.dirname, '../../../script/publish-check/demo-browser-check.ts')],
        {
            cwd: consumer,
            stdio: 'inherit',
            env: { ...process.env, CONSUMER_ROOT: consumer },
        },
    );

    console.log('\ndemo publish check passed');
} finally {
    rmSync(workspace, { recursive: true, force: true });
}
