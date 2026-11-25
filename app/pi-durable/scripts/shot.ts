import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { HERO_SHOTS } from '../src/shots';
import { STORIES } from '../src/stories';
import {
    backupFiles,
    loadJSON,
    watchFingerprints,
    writeStudio,
    type StudioCard,
} from '../../../script/shot-studio';
const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const watch = args.includes('--watch') || args.includes('-w');
const sheetOnly = args.includes('--sheet');
const storiesOnly = args.includes('stories') || args.includes('--composite');
const requested = (args.find((arg) => !arg.startsWith('-')) ?? 'all').split(',').filter(Boolean);
const out = process.env.SG_DURABLE_SHOTS ?? resolve(root, '../../docs/screenshots');
mkdirSync(out, { recursive: true });
const heroIDs = HERO_SHOTS.map((shot) => shot.id);
const storyIDs = STORIES.map((story) => story.id);
const known = new Set([...heroIDs, ...storyIDs]);
if (requested[0] !== 'all' && requested[0] !== 'stories' && requested.some((id) => !known.has(id))) {
    console.error(`Unknown shot: ${requested.join(',')}`);
    process.exit(1);
}
const heroes = requested[0] === 'all' ? heroIDs : storiesOnly ? [] : requested.filter((id) => heroIDs.includes(id));
const stories = requested[0] === 'all' || storiesOnly
    ? requested[0] === 'stories' && requested.length > 1 ? requested.slice(1) : storyIDs
    : requested.filter((id) => storyIDs.includes(id));
const review = loadJSON<Record<string, { verdict?: string; note?: string }>>(resolve(out, 'pi-durable-review.json')) ?? {};
const play = (spec: string, env: Record<string, string>): boolean =>
    spawnSync('pnpm', ['exec', 'playwright', 'test', '--config', 'playwright.config.ts', spec], {
        cwd: root,
        env: { ...process.env, ...env },
        stdio: 'inherit',
    }).status === 0;
const capture = (): boolean => {
    const env = { ...process.env, SG_DURABLE_SHOTS: out, PI_DURABLE_FAUX_SEED: 'fixed' };
    if (heroes.length) {
        backupFiles(heroes.map((id) => resolve(out, `pi-durable/${id}.png`)));
        if (!play('tests/screenshots.spec.ts', { ...env, SG_DURABLE_SHOT: heroes.join(',') })) return false;
    }
    if (stories.length) {
        backupFiles(stories.map((id) => resolve(out, `pi-durable/stories/${id}.png`)));
        if (!play('tests/stories.spec.ts', { ...env, SG_DURABLE_STORY: stories.join(',') })) return false;
    }
    return true;
};
const cards: readonly StudioCard[] = [
    ...HERO_SHOTS.map((shot) => ({ id: shot.id, title: shot.title, question: shot.question, file: shot.file })),
    ...STORIES.map((story) => ({ id: story.id, title: story.title, question: story.question, file: story.file })),
];
const sheet = (): void =>
    writeStudio({
        out,
        title: 'Pi Durable — screenshot studio',
        filename: 'pi-durable-index.html',
        reviewKey: 'pi-durable:review',
        review,
        cards,
        copyTarget: 'docs/screenshots/pi-durable/review.json',
        watch,
    });
if (sheetOnly || capture()) sheet();
else process.exit(1);
console.log(`\nScreenshot studio: file://${resolve(out, 'pi-durable-index.html')}`);
if (watch && !sheetOnly) {
    const tracked = cards.map((card) => card.file);
    const fingerprint = (): string =>
        tracked
            .map((file) => {
                const path = resolve(out, file);
                return existsSync(path) ? statSync(path).mtimeMs : 0;
            })
            .join('|');
    watchFingerprints(4000, fingerprint, () => {
        if (capture()) sheet();
    });
}
