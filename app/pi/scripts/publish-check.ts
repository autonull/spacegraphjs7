// Proves the packed @spacegraphjs/agent works in a consumer that has no workspace link to the
// library and no Pi installed. The Pi app depends on the library; the library never depends on Pi.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createPackedConsumer, pickPackages, RUNTIME_DEPENDENCIES } from '../../../script/publish-check/pack.js';

const root = resolve(import.meta.dirname, '../../..');
const tsx = resolve(root, 'node_modules/.bin/tsx');
const packages = pickPackages(root, [
    'library',
    'agent',
    'adapter',
    'config',
    'kernel',
    'search',
    'shared',
    'trace',
]);

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
