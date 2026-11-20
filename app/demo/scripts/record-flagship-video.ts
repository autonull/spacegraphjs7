import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const workspace = resolve(import.meta.dirname, '../../..');
const output = resolve(workspace, 'public/flagship/flagship.mp4');
const url = process.env.FLAGSHIP_URL ?? 'http://localhost:5175/';
const frames = mkdtempSync(join(tmpdir(), 'spacegraph-frames-'));
const frame = (index: number) => join(frames, `${String(index).padStart(4, '0')}.png`);
const hook = (fn: string, ...args: unknown[]) =>
    page.evaluate(({ fn, args }) => (window as any).__pi[fn](...args), { fn, args });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url);
await page.waitForFunction(() => (window as any).__pi?.ready === true, { timeout: 30_000 });
await hook('loadFixture');
await hook('setDepth', 'flat');
await hook('setArrangement', 'stacked');
await hook('settle');
await page.evaluate(() => {
    const sg = [...((window as any).SpaceGraph?.instances ?? [])][0];
    sg?.fitView(60, 0);
});
await page.waitForTimeout(500);

for (let index = 0; index < 72; index++) {
    if (index === 48) await page.locator('[data-capability="question-1"]').click();
    if (index < 36) await hook('pan', 3, 0);
    else await hook('pan', -3, 0);
    await page.screenshot({ path: frame(index) });
}
await browser.close();

const converted = spawnSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    '12',
    '-i',
    join(frames, '%04d.png'),
    '-c:v',
    'libx264',
    '-crf',
    '28',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    output,
]);
rmSync(frames, { recursive: true, force: true });
if (converted.status !== 0)
    throw new Error(String(converted.stderr ?? converted.error ?? 'ffmpeg failed'));
console.log(`recorded ${output}`);
