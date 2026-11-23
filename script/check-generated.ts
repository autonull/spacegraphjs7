// Regenerates the demo registry and the published manifests into a temp directory. A committed file
// that differs from its generator output is stale drift, not something to fix by hand in a later PR.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tsx = resolve(root, 'node_modules/.bin/tsx');
const prettier = resolve(root, 'node_modules/.bin/prettier');
const manifests = ['renderer', 'adapter', 'spacegraph-renderer', 'cytoscape-renderer', 'svg-renderer'];

function compare(generated: string, committed: string) {
    const actual = readFileSync(generated, 'utf8');
    const expected = readFileSync(resolve(root, committed), 'utf8');
    if (actual === expected) return;
    const lines = actual.split('\n');
    const first = lines.findIndex((line, index) => line !== expected.split('\n')[index]);
    throw new Error(`${committed} is stale; first difference at line ${first + 1}`);
}

const workspace = mkdtempSync(join(tmpdir(), 'spacegraph-generated-'));
try {
    execFileSync(tsx, ['script/generate-demo-registry.ts', '--out', join(workspace, 'registry.ts')], {
        cwd: root,
        stdio: 'inherit',
    });
    execFileSync(
        prettier,
        ['--config', resolve(root, '.prettierrc'), '--write', join(workspace, 'registry.ts')],
        { cwd: root, stdio: 'inherit' },
    );
    execFileSync(tsx, ['script/write-exports.ts', '--out', join(workspace, 'manifests')], {
        cwd: root,
        stdio: 'inherit',
    });

    compare(join(workspace, 'registry.ts'), 'app/demo/src/registry.ts');
    compare(join(workspace, 'manifests/package.json'), 'package.json');
    for (const name of manifests) {
        compare(
            join(workspace, 'manifests/packages', name, 'package.json'),
            join('packages', name, 'package.json'),
        );
    }
    console.log('generated check passed: registry and published manifests match their generators');
} finally {
    rmSync(workspace, { recursive: true, force: true });
}
