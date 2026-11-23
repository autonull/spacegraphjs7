import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI_PRESETS } from '../src/ui/presets';

const OUT =
    process.env.SG_PI_SHOTS ??
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/screenshots');

const capture = async (page: Page, presetID: string, ui: string, file: string): Promise<void> => {
    await page.goto(`/?shot=ui-${presetID}&ui=${ui}`);
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect.poll(() => page.evaluate(() => (window as any).__pi.ui())).toBe(ui);
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.simulation().settled), {
            timeout: 10_000,
        })
        .toBe(true);
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.shotReady?.() === true))
        .toBe(true);
    await page.mouse.move(800, 500);
    await page.screenshot({ path: file, animations: 'disabled' });
};

for (const preset of UI_PRESETS.filter((entry) => entry.id !== 'full')) {
    test(`compare: ${preset.id}`, async ({ page }) => {
        const dir = resolve(OUT, 'labs', 'ui-presets', preset.id);
        mkdirSync(dir, { recursive: true });
        await capture(page, preset.id, 'full', resolve(dir, 'incumbent.png'));
        await capture(page, preset.id, preset.id, resolve(dir, 'variant.png'));
    });
}
