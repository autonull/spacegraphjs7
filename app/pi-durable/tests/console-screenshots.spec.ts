import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CONSOLE_SHOTS, type ConsoleShot } from '../src/shots';
import { call, settle } from './boot';

const OUT = process.env.SG_DURABLE_SHOTS ?? resolve(import.meta.dirname, '../../../docs/screenshots');
mkdirSync(OUT, { recursive: true });

const requested = process.env.SG_DURABLE_CONSOLE_SHOT?.split(',')
    .map((id) => id.trim())
    .filter(Boolean);
const shots: readonly ConsoleShot[] = requested?.length
    ? CONSOLE_SHOTS.filter((shot) => requested.includes(shot.id))
    : CONSOLE_SHOTS;

const compact = (value: string): string =>
    btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const lineIDs = (page: Page): Promise<string[]> =>
    page
        .locator('#canvas .sg-terminal-line')
        .evaluateAll((nodes) =>
            nodes.map((node) => node.closest<HTMLElement>('[data-node-id]')?.dataset['nodeId'] ?? ''),
        );

for (const shot of shots) {
    test(`console shot: ${shot.id} — ${shot.title}`, async ({ page }) => {
        test.skip(!process.env.SG_DURABLE_SHOTS, 'capture-only: use pnpm --filter pi-durable shot');
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.setViewportSize(shot.viewport ?? { width: 1600, height: 1000 });
        const params = new URLSearchParams({ shot: shot.source });
        if (shot.query)
            for (const [key, value] of new URLSearchParams(shot.query)) params.set(key, value);
        await page.goto(`/?${params.toString()}`);
        await page.waitForFunction(
            () => (window as { __durable?: { ready?: () => boolean } }).__durable?.ready?.() === true,
        );
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
        await call(page, 'setView', 'transcript');
        if (shot.rtl) await call(page, 'setDirection', 'rtl');
        if (shot.regions) await call(page, 'consoleRegions', true);
        if (shot.profile) await call(page, 'consoleProfile', shot.profile);
        await settle(page);
        if (shot.palette) {
            await call(page, 'setConsolePalette', shot.palette);
            await settle(page);
        }
        if (shot.zoomOut) {
            await call(page, 'zoomBy', shot.zoomOut);
            await settle(page);
        }
        if (shot.detailMode) {
            await call(page, 'setConsoleDetailMode', shot.detailMode);
            const target = (await lineIDs(page))[shot.detailLine ?? 1];
            if (target) {
                await call(page, 'toggleConsoleDetail', target);
                await settle(page);
            }
        }
        if (shot.selection) {
            const ids = await lineIDs(page);
            const first = ids[shot.selection[0]];
            const last = ids[shot.selection[1]];
            if (first && last) {
                await call(
                    page,
                    'applyAddress',
                    compact(`view=transcript&sel=${first}:0~${last}:4&tail=${last}&version=1`),
                );
                await settle(page);
            }
        }
        const file = resolve(OUT, shot.file);
        mkdirSync(dirname(file), { recursive: true });
        await page.screenshot({ path: file, animations: 'disabled' });
        const vision = await call<{ score: number; canvas: boolean }>(page, 'vision');
        expect(vision.canvas).toBe(true);
        expect(vision.score).toBeGreaterThan(0.5);
        expect(errors).toEqual([]);
    });
}
