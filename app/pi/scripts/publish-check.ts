// Proves the packed @spacegraphjs/agent works in a consumer that has no workspace link to the
// library and no Pi installed. The Pi app depends on the library; the library never depends on Pi.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createPackedConsumer, RUNTIME_DEPENDENCIES } from '../../../script/publish-check/pack.js';

const root = resolve(import.meta.dirname, '../../..');
const tsx = resolve(root, 'node_modules/.bin/tsx');
const packages = [
    { name: 'spacegraphjs', dir: root },
    { name: '@spacegraphjs/agent', dir: join(root, 'packages/domain/agent') },
    { name: '@spacegraphjs/adapter', dir: join(root, 'packages/adapter') },
    { name: '@spacegraphjs/config', dir: join(root, 'packages/config') },
    { name: '@spacegraphjs/kernel', dir: join(root, 'packages/kernel') },
    { name: '@spacegraphjs/search', dir: join(root, 'packages/search') },
    { name: '@spacegraphjs/shared', dir: join(root, 'packages/shared') },
    { name: '@spacegraphjs/trace', dir: join(root, 'packages/trace') },
];

const workspace = mkdtempSync(join(tmpdir(), 'spacegraph-pi-consumer-'));
const consumer = join(workspace, 'consumer');

try {
    createPackedConsumer(root, packages, RUNTIME_DEPENDENCIES, consumer, join(workspace, 'tarballs'));
    copyFileSync(join(import.meta.dirname, 'publish-check/consumer.ts'), join(consumer, 'check.ts'));

    console.log('\npi publish check: the packed agent runs without Pi');
    execFileSync(tsx, ['check.ts'], { cwd: consumer, stdio: 'inherit' });

    console.log('pi publish check passed');
} finally {
    rmSync(workspace, { recursive: true, force: true });
}
