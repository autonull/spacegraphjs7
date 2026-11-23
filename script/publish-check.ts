// Proves the published packages are consumable outside the monorepo.
//
// The check is network-free and uses the bytes npm would install: each package is packed with
// `npm pack`, the tarball is extracted into a consumer's `node_modules`, and the consumer runs
// against that. Nothing in the consumer resolves to the workspace.
//
// Two checks run:
//   - a node check that imports the contract, the model adapter and both interactive adapters, and
//     mounts the Cytoscape adapter into a jsdom container;
//   - a browser check that mounts both interactive adapters for real and reports what they drew.
//
// The consumer lives outside the repository, so a workspace link cannot satisfy an import by accident.
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createPackedConsumer, RUNTIME_DEPENDENCIES } from './publish-check/pack.js';

const root = resolve(import.meta.dirname, '..');
const tsx = resolve(root, 'node_modules/.bin/tsx');
const packages = [
    { name: 'spacegraphjs', dir: root },
    { name: '@spacegraphjs/renderer', dir: join(root, 'packages/renderer') },
    { name: '@spacegraphjs/shared', dir: join(root, 'packages/shared') },
    { name: '@spacegraphjs/kernel', dir: join(root, 'packages/kernel') },
    { name: '@spacegraphjs/adapter', dir: join(root, 'packages/adapter') },
    { name: '@spacegraphjs/spacegraph-renderer', dir: join(root, 'packages/spacegraph-renderer') },
    { name: '@spacegraphjs/cytoscape-renderer', dir: join(root, 'packages/cytoscape-renderer') },
    { name: '@spacegraphjs/svg-renderer', dir: join(root, 'packages/svg-renderer') },
    { name: '@spacegraphjs/workflow', dir: join(root, 'packages/domain/workflow') },
    { name: '@spacegraphjs/filesystem', dir: join(root, 'packages/domain/filesystem') },
    { name: '@spacegraphjs/data', dir: join(root, 'packages/domain/data') },
];

// The packages' runtime dependencies are not part of the tarball; the consumer resolves them from the
// library's install so the check needs no network.
const workspace = mkdtempSync(join(tmpdir(), 'spacegraph-publish-'));
const consumer = join(workspace, 'consumer');
const tarballs = join(workspace, 'tarballs');

try {
    createPackedConsumer(root, packages, RUNTIME_DEPENDENCIES, consumer, tarballs);

    writeFileSync(
        join(consumer, 'check.ts'),
        readFileSync(resolve(import.meta.dirname, 'publish-check/consumer/check.ts')),
    );
    writeFileSync(
        join(consumer, 'browser.html'),
        readFileSync(resolve(import.meta.dirname, 'publish-check/consumer/browser.html')),
    );
    writeFileSync(
        join(consumer, 'browser.ts'),
        readFileSync(resolve(import.meta.dirname, 'publish-check/consumer/browser.ts')),
    );

    console.log('\nnode check: the published contract and adapters');
    execFileSync(tsx, ['check.ts'], { cwd: consumer, stdio: 'inherit' });

    console.log('\nbrowser check: both interactive adapters mount and draw');
    execFileSync(tsx, [resolve(import.meta.dirname, 'publish-check/consumer/browser-check.ts')], {
        cwd: consumer,
        stdio: 'inherit',
        env: { ...process.env, CONSUMER_ROOT: consumer },
    });

    console.log('\npublish check passed');
} finally {
    rmSync(workspace, { recursive: true, force: true });
}
