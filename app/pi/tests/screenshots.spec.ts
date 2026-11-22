import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOTS, type Shot } from '../src/shots';

const OUT =
    process.env.SG_PI_SHOTS ??
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/screenshots');
mkdirSync(OUT, { recursive: true });

const requested = process.env.SG_PI_SHOT?.split(',').map((id) => id.trim()).filter(Boolean);
const shots: readonly Shot[] = requested?.length ? SHOTS.filter((shot) => requested.includes(shot.id)) : SHOTS;

const settleCamera = async (page: Page): Promise<void> => {
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.simulation().settled), {
            timeout: 10_000,
        })
        .toBe(true);
    await page.waitForFunction(
        () => {
            const pi = (window as any).__pi;
            if (!pi?.shotReady?.()) return false;
            const viewport = pi.viewport();
            const key = `${viewport.zoom.toFixed(3)}:${viewport.center.map((value: number) => value.toFixed(2)).join(',')}`;
            const state = window as unknown as { sgKey?: string; sgStable?: number };
            if (state.sgKey === key) state.sgStable = (state.sgStable ?? 0) + 1;
            else {
                state.sgKey = key;
                state.sgStable = 1;
            }
            return state.sgStable >= 3;
        },
        undefined,
        { timeout: 8_000, polling: 120 },
    );
};

const boot = async (page: Page, shot: Shot): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(shot.viewport ?? { width: 1600, height: 1000 });
    await page.goto(`/?shot=${shot.id}`);
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => (window as any).__pi.settle());
    await settleCamera(page);
    await page.mouse.move(800, 500);
    return errors;
};

for (const shot of shots) {
    test(`shot: ${shot.id} — ${shot.title}`, async ({ page }) => {
        const errors = await boot(page, shot);
        await page.screenshot({ path: resolve(OUT, shot.file), animations: 'disabled' });
        expect(errors).toEqual([]);
    });
}

test('shot: policy provenance comes from the preset', async ({ page }) => {
    const shot = SHOTS.find((entry) => entry.id === 'policy')!;
    const errors = await boot(page, shot);
    const source = await page.evaluate(
        () => (window as any).__pi.policy().provenance['camera.verbMs'],
    );
    expect(source).toBe('preset');
    expect(errors).toEqual([]);
});

test('shot: motion preset provenance comes from the preset', async ({ page }) => {
    const shot = SHOTS.find((entry) => entry.id === 'living-graph')!;
    const errors = await boot(page, shot);
    const provenance = await page.evaluate(() => {
        const resolved = (window as any).__pi.policy();
        return Object.fromEntries(
            ['salience.decayRate', 'ladder.blendMs', 'camera.verbMs', 'camera.traceMs'].map((id) => [
                id,
                resolved.provenance[id],
            ]),
        );
    });
    expect(provenance).toEqual({
        'salience.decayRate': 'preset',
        'ladder.blendMs': 'preset',
        'camera.verbMs': 'preset',
        'camera.traceMs': 'preset',
    });
    expect(errors).toEqual([]);
});
