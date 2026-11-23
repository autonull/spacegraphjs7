// D5 gate: generate a fourth domain and host through create-spacegraph-domain, then run the
// generated conformance suite and one-way dependency guard. The scaffold must prove itself, not just
// describe a recipe.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tempRoot = '/tmp/opencode';
mkdirSync(tempRoot, { recursive: true });
const workspace = mkdtempSync(join(tempRoot, 'spacegraph-extension-'));
const name = 'probe';
const generated = join(workspace, name);

const required = [
    'domain/src/vocabulary.ts',
    'domain/src/mapping.ts',
    'domain/src/selectors.ts',
    'domain/src/facets.ts',
    'domain/src/fixture.ts',
    'domain/src/conformance.test.ts',
    'host/package.json',
    'host/index.html',
    'host/src/main.ts',
    'host/src/spine.ts',
    'host/tests/spine.test.ts',
    'host/tests/vision.spec.ts',
    'host/scripts/verify.ts',
];

try {
    console.log('\nscaffold: create-spacegraph-domain probe thing');
    execFileSync(
        process.execPath,
        [resolve(root, 'packages/create-spacegraph/domain.js'), name, 'thing'],
        { cwd: workspace, stdio: 'inherit' },
    );

    for (const file of required) {
        if (!existsSync(join(generated, file))) throw new Error(`scaffold did not write ${file}`);
    }

    const config = join(generated, 'vitest.config.ts');
    writeFileSync(
        config,
        `import base from ${JSON.stringify(resolve(root, 'vitest.config.ts'))};

export default {
    root: ${JSON.stringify(generated)},
    resolve: { alias: base.resolve.alias },
    test: {
        environment: 'jsdom',
        pool: 'vmThreads',
        include: ['domain/src/conformance.test.ts'],
        globals: false,
    },
};
`,
    );

    console.log('\nconformance: the generated domain passes the shared adapter suite');
    execFileSync(resolve(root, 'node_modules/.bin/vitest'), ['run', '--config', config], {
        cwd: root,
        stdio: 'inherit',
    });

    console.log('\nboundary: the host vocabulary does not leak into the generated domain');
    execFileSync(resolve(root, 'node_modules/.bin/tsx'), ['scripts/verify.ts'], {
        cwd: join(generated, 'host'),
        stdio: 'inherit',
    });

    const source = readFileSync(join(generated, 'domain/src/fixture.ts'), 'utf8');
    if (!source.includes("kind === 'state'")) {
        throw new Error('generated adapter no longer marks the structural node as chrome');
    }

    console.log('\nextension check passed: generated domain and host satisfy the recipe');
} finally {
    rmSync(workspace, { recursive: true, force: true });
}
