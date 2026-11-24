import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SHOTS, type Shot } from '../src/shots';
import { call } from './boot';

const OUT = process.env.SG_DURABLE_SHOTS ?? resolve(import.meta.dirname, '../../../docs/screenshots');
mkdirSync(OUT, { recursive: true });

const requested = process.env.SG_DURABLE_SHOT?.split(',').map((id) => id.trim()).filter(Boolean);
const shots: readonly Shot[] = requested?.length ? SHOTS.filter((shot) => requested.includes(shot.id)) : SHOTS;

const settle = async (page: Page): Promise<void> => {
    await page.waitForFunction(() => {
        const api = (window as unknown as { __durable?: { viewport: () => { zoom: number } } }).__durable;
        if (!api?.viewport) return false;
        const state = window as unknown as { sgKey?: string; sgStable?: number };
        const key = String(api.viewport().zoom.toFixed(3));
        if (state.sgKey === key) state.sgStable = (state.sgStable ?? 0) + 1;
        else {
            state.sgKey = key;
            state.sgStable = 1;
        }
        return state.sgStable >= 3;
    }, undefined, { timeout: 8_000, polling: 120 });
};

for (const shot of shots) {
    test(`shot: ${shot.id} — ${shot.title}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.setViewportSize(shot.viewport ?? { width: 1600, height: 1000 });
        await page.goto(`/?shot=${shot.id}`);
        await page.waitForFunction(() => (window as { __durable?: { ready?: () => boolean } }).__durable?.ready?.() === true);
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
        await settle(page);
        const file = resolve(OUT, shot.file);
        mkdirSync(dirname(file), { recursive: true });
        await page.screenshot({ path: file, animations: 'disabled' });
        const vision = await call<{ score: number; canvas: boolean }>(page, 'vision');
        expect(vision.canvas).toBe(true);
        expect(vision.score).toBeGreaterThan(0.5);
        expect(errors).toEqual([]);
    });
}
