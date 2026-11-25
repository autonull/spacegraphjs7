import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOTS } from '../src/shots';
import {
    backupFiles,
    loadJSON,
    watchFingerprints,
    writeStudio,
    type StudioCard,
    type StudioExperiment,
} from '../../../script/shot-studio';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const watch = args.includes('--watch') || args.includes('-w');
const sheetOnly = args.includes('--sheet');
const positional = args.filter((arg) => !arg.startsWith('-'));
const id = positional[0] ?? 'all';
const requested = id.split(',').map((entry) => entry.trim()).filter(Boolean);
const outIndex = args.indexOf('--out');
const out = resolve(root, outIndex >= 0 ? args[outIndex + 1]! : '../../docs/screenshots');
mkdirSync(out, { recursive: true });
const review = loadJSON<Record<string, { verdict?: string; note?: string }>>(resolve(out, 'review.json')) ?? {};
const experiments = loadJSON<{ experiments?: StudioExperiment[] }>(resolve(out, 'experiments.json'))?.experiments ?? [];
const valid = id === 'all' ? SHOTS : SHOTS.filter((shot) => requested.includes(shot.id));
if (id !== 'all' && (!valid.length || valid.length !== requested.length)) {
    console.error(`Unknown shot "${id}". Available: ${SHOTS.map((shot) => shot.id).join(', ')}`);
    process.exit(1);
}
const capture = (): boolean => {
    backupFiles(SHOTS.map((shot) => resolve(out, shot.file)));
    const env = { ...process.env, SG_PI_SHOTS: out, SG_PI_SHOT: id === 'all' ? '' : requested.join(',') };
    const grep = id === 'all' ? 'shot:' : `shot: (${requested.join('|')})`;
    return spawnSync(
        'pnpm',
        ['exec', 'playwright', 'test', '--config', 'playwright.config.ts', 'tests/screenshots.spec.ts', '--grep', grep],
        { cwd: root, env, stdio: 'inherit' },
    ).status === 0;
};
const cards: readonly StudioCard[] = SHOTS.map((shot) => ({
    id: shot.id,
    title: shot.title,
    question: shot.question,
    file: shot.file,
    url: `http://localhost:${process.env.SG_PI_PORT ?? 5175}/?shot=${shot.id}`,
}));
const sheet = (): void =>
    writeStudio({
        out,
        title: 'Screenshot studio',
        filename: 'index.html',
        reviewKey: 'spacegraph:review',
        review,
        cards,
        experiments,
        copyTarget: 'docs/screenshots/review.json',
        watch,
    });
const sourceFiles = (): string => {
    const files = ['index.html', 'tests/screenshots.spec.ts'];
    const walk = (dir: string): void => {
        const full = resolve(root, dir);
        if (!existsSync(full)) return;
        for (const entry of readdirSync(full, { withFileTypes: true })) {
            const relative = `${dir}/${entry.name}`;
            if (entry.isDirectory()) walk(relative);
            else if (entry.name.endsWith('.ts')) files.push(relative);
        }
    };
    walk('src');
    walk('../../packages/shared/src');
    return files
        .map((file) => `${file}:${existsSync(resolve(root, file)) ? statSync(resolve(root, file)).mtimeMs : 0}`)
        .join('|');
};
if (sheetOnly || capture()) sheet();
else process.exit(1);
console.log(`\nScreenshot studio: file://${resolve(out, 'index.html')}`);
if (watch && !sheetOnly) {
    console.log('Watching source files. Ctrl-C to stop.');
    watchFingerprints(700, sourceFiles, () => {
        if (capture()) sheet();
    });
}
