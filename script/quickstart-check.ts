// Executes the documented quickstart in a clean consumer. The scaffold and every import resolve to
// packed tarballs, so a broken guide command or a generated app that only works inside the monorepo
// fails here. Dependencies are symlinked from the install instead of fetched (the check is offline).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createPackedConsumer, pickPackages, RUNTIME_DEPENDENCIES } from './publish-check/pack.js';

const root = resolve(import.meta.dirname, '..');
const guide = readFileSync(resolve(root, 'docs/QUICKSTART.md'), 'utf8');
const scaffoldSource = readFileSync(
    resolve(root, 'packages/create-spacegraph/index.js'),
    'utf8',
);

const DEFAULT_SPEC = scaffoldSource.match(/DEFAULT_SPEC = '\^(\d+\.\d+\.\d+)'/)?.[1];
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
if (DEFAULT_SPEC !== version) {
    throw new Error(`scaffold default ^${DEFAULT_SPEC} is out of sync with spacegraphjs ${version}`);
}

const packages = pickPackages(
    root,
    [
        'library',
        'renderer',
        'shared',
        'kernel',
        'adapter',
        'spaceRenderer',
        'cytoscapeRenderer',
        'svgRenderer',
        'create',
    ],
    { create: { requiresDist: false } },
);

function blockAfter(heading: string): string {
    const marker = `### ${heading}`;
    const start = guide.indexOf(marker);
    if (start < 0) throw new Error(`quickstart heading not found: ${marker}`);
    const match = guide.slice(start).match(/```\w+\n([\s\S]*?)\n```/);
    if (!match) throw new Error(`quickstart code block not found after: ${marker}`);
    return `${match[1]}\n`;
}

const workspace = mkdtempSync(join(tmpdir(), 'spacegraph-quickstart-'));
const consumer = join(workspace, 'consumer');
const tarballs = join(workspace, 'tarballs');

try {
    createPackedConsumer(
        root,
        packages,
        [...RUNTIME_DEPENDENCIES, 'vite', 'typescript'],
        consumer,
        tarballs,
    );

    const app = join(consumer, 'my-graph');
    console.log('\nscaffold: pnpm dlx create-spacegraph my-graph');
    execFileSync(
        process.execPath,
        [join(consumer, 'node_modules/create-spacegraph/index.js'), 'my-graph'],
        {
            cwd: consumer,
            stdio: 'inherit',
            env: {
                ...process.env,
                SPACEGRAPHJS_SPEC: `file:${join(consumer, 'node_modules/spacegraphjs')}`,
            },
        },
    );

    const manifest = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
    for (const script of ['dev', 'build', 'preview', 'typecheck']) {
        if (!manifest.scripts?.[script]) throw new Error(`generated app has no ${script} script`);
    }
    if (!manifest.dependencies?.spacegraphjs?.startsWith('file:')) {
        throw new Error('the generated app does not point at the packed spacegraphjs bytes');
    }
    symlinkSync(join(consumer, 'node_modules'), join(app, 'node_modules'), 'dir');

    console.log('\nguide: write the documented index.html, src/main.ts and vite.config.ts');
    writeFileSync(join(app, 'index.html'), blockAfter('2. Replace `index.html` with this file'));
    writeFileSync(join(app, 'src/main.ts'), blockAfter('3. Replace `src/main.ts` with this graph'));
    writeFileSync(join(app, 'vite.config.ts'), blockAfter('4. Keep the generated `vite.config.ts`'));

    console.log('\ntypecheck: the documented main.ts against packed declarations');
    execFileSync(process.execPath, [join(consumer, 'node_modules/typescript/bin/tsc'), '--noEmit'], {
        cwd: app,
        stdio: 'inherit',
    });

    console.log('\nbuild: the documented app against packed bytes');
    execFileSync(process.execPath, [join(consumer, 'node_modules/vite/bin/vite.js'), 'build'], {
        cwd: app,
        stdio: 'inherit',
    });

    console.log('\nquickstart check passed');
} finally {
    rmSync(workspace, { recursive: true, force: true });
}
