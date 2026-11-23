// D2 upgrade gate: the previously committed public surface must still be importable from the bytes
// npm would install. The repository's packages are not on the registry, so the "previous release" is
// the committed snapshot; the new release is packed with the same harness as test:publish.
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createPackedConsumer } from './publish-check/pack.js';
import { LIBRARY_ENTRIES } from './library-entries.js';
import { compilerOptions, exportedNames } from './surface.js';

const root = resolve(import.meta.dirname, '..');
const previous = JSON.parse(readFileSync(resolve(root, 'test/fixtures/public-surface.json'), 'utf8')) as Record<string, string[]>;
const tempRoot = '/tmp/opencode';
mkdirSync(tempRoot, { recursive: true });
const workspace = mkdtempSync(join(tempRoot, 'spacegraph-upgrade-'));

try {
    const consumer = join(workspace, 'consumer');
    createPackedConsumer(root, [{ name: 'spacegraphjs', dir: root }], [], consumer, join(workspace, 'tarballs'));

    const files = LIBRARY_ENTRIES.map((entry) => join(consumer, 'node_modules/spacegraphjs', entry.types));
    const current = exportedNames(files, compilerOptions(root));
    const removals: string[] = [];
    const additions: string[] = [];

    LIBRARY_ENTRIES.forEach((entry, index) => {
        const packed = current.get(files[index]!) ?? [];
        for (const name of previous[entry.subpath] ?? []) {
            if (!packed.includes(name)) removals.push(`${entry.subpath}: ${name}`);
        }
        for (const name of packed) {
            if (!(previous[entry.subpath] ?? []).includes(name)) additions.push(`${entry.subpath}: ${name}`);
        }
    });

    if (removals.length) {
        throw new Error(`upgrade breaks the previous surface:\n  ${removals.join('\n  ')}`);
    }
    console.log(
        `upgrade check passed: ${LIBRARY_ENTRIES.length} packed entries, ${additions.length} additive exports`,
    );
} finally {
    rmSync(workspace, { recursive: true, force: true });
}
