import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = process.env.SG_SCALE_LAB_SHOTS ?? resolve(root, 'docs/screenshots/labs/scale-lab');

const candidates = {
    'spiral-070-d3': { radius: 0.7, depth: 3, shape: 'spiral', phase: 0.2, palette: 'steps' },
    'spiral-050-d3': { radius: 0.5, depth: 3, shape: 'spiral', phase: 0.2, palette: 'steps' },
    'ring-070-d2': { radius: 0.7, depth: 2, shape: 'ring', phase: 0, palette: 'steps' },
} as const;

const capture = async (page: Page, query: string, variant: string, file: string): Promise<void> => {
    await page.goto(`/html/core/scale-lab.html?variant=${query}`);
    await page.waitForFunction(() => Boolean((globalThis as any).__scaleLab));
    await expect.poll(() => page.evaluate(() => (globalThis as any).__scaleLab.variant)).toBe(variant);
    await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: file, animations: 'disabled' });
};

test.describe('scale lab proof pairs', () => {
    for (const [id, config] of Object.entries(candidates)) {
        test(`captures ${id}`, async ({ page }) => {
            const dir = resolve(OUT, id);
            mkdirSync(dir, { recursive: true });
            await capture(page, 'incumbent', 'incumbent', resolve(dir, 'incumbent.png'));
            const query = new URLSearchParams({
                variant: 'variant',
                radius: String(config.radius),
                depth: String(config.depth),
                shape: config.shape,
                phase: String(config.phase),
                palette: config.palette,
            });
            await capture(page, query.toString(), 'variant', resolve(dir, 'variant.png'));
        });
    }
});
