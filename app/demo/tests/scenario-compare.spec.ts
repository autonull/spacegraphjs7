import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT =
    process.env.SG_SCENARIO_SHOTS ??
    resolve(root, 'docs/screenshots/scenario-workflow-chapters');

const capture = async (page: import('@playwright/test').Page, layout: string, file: string) => {
    await page.goto(`/html/core/scenario.html?domain=workflow&layout=${layout}`);
    await page.waitForFunction(() => Boolean((globalThis as any).__scenario));
    await expect.poll(() => page.evaluate(() => (globalThis as any).__scenario.layout)).toBe(layout);
    await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: file, animations: 'disabled' });
};

test.describe('scenario proof pair', () => {
    test('captures the workflow incumbent and chapter variant', async ({ page }) => {
        mkdirSync(OUT, { recursive: true });
        await capture(page, 'grid', resolve(OUT, 'incumbent.png'));
        await capture(page, 'chapters', resolve(OUT, 'variant.png'));
    });
});
