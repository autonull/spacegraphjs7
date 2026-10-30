import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

// L1.29 — the non-OpenCode reference demo. Served by the repo vite (`root: demo`), so the page is
// `/contract.html`; run `pnpm run dev:demo` first (or set SG_DEMO_URL to a running server).
// Use PLAYWRIGHT_BASE_URL from playwright.config.ts which defaults to http://localhost:5173
const BASE_URL =
    process.env.PLAYWRIGHT_BASE_URL || process.env.SG_DEMO_URL || 'http://localhost:5173';
const SHOT_DIR =
    process.env.CONTRACT_DEMO_SHOTS ?? resolve(process.cwd(), '../docs/spacegraph/screenshots');

async function boot(page: Page) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/contract.html');
    await page.waitForFunction(() => (window as any).__ready === true);
    await page.evaluate(() => document.fonts.ready);
    return errors;
}

async function waitForRenderer(page: Page, id: string) {
    await page.waitForFunction(
        (wanted) => (window as any).__contractDemo?.renderer() === wanted,
        id,
    );
}

const noErrors = (errors: string[]) =>
    expect(errors.filter((error) => !error.includes('favicon'))).toEqual([]);

test.describe('renderer contract demo (L1.29)', () => {
    test('renders one activity model through the SpaceGraph adapter', async ({ page }) => {
        const errors = await boot(page);

        await expect(page.locator('[data-renderer="spacegraph"]')).toBeVisible();
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
        expect(await page.evaluate(() => (window as any).__contractDemo.nodeCount())).toBe(14);
        await expect(page.locator('.demo-card', { hasText: 'grep' })).toContainText('totals');
        await expect(page.locator('#detail h2')).toHaveText('Reconcile invoice totals');
        await expect(page.locator('#band')).toContainText('Band:');

        noErrors(errors);
    });

    test('switches renderers, gates 3D, and exports static SVG', async ({ page }) => {
        const errors = await boot(page);

        await page.locator('#renderer-cytoscape').click();
        await waitForRenderer(page, 'cytoscape');
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
        expect(await page.evaluate(() => (window as any).__contractDemo.nodeCount())).toBe(14);
        await expect(page.locator('#projection-3d')).toBeDisabled();
        await expect(page.locator('#projection-2d')).toHaveAttribute('aria-pressed', 'true');

        await page.locator('#renderer-spacegraph').click();
        await waitForRenderer(page, 'spacegraph');
        await page.locator('#projection-3d').click();
        expect(await page.evaluate(() => (window as any).__contractDemo.projection())).toBe('3d');

        await page.locator('#renderer-svg').click();
        await waitForRenderer(page, 'svg');
        await expect(page.locator('#svg svg')).toBeVisible();
        await expect(page.locator('#svg')).toContainText('Reconcile invoice totals');
        await expect(page.locator('#fit')).toBeDisabled();

        await page.locator('#renderer-spacegraph').click();
        await waitForRenderer(page, 'spacegraph');
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });

        noErrors(errors);
    });

    test('traverses the accessibility mirror, follows connections, and walks the trail', async ({
        page,
    }) => {
        const errors = await boot(page);

        // The hidden list is ordered and roving: root -> plan -> grep.
        await page.locator('#a11y li[data-id="root"]').focus();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await expect(page.locator('#detail h2')).toHaveText('grep');
        expect(await page.evaluate(() => (window as any).__contractDemo.selection())).toEqual([
            'search',
        ]);

        await page.keyboard.press('Escape');
        await expect(page.locator('#detail')).toContainText('Select a node to inspect it.');

        // Verify the failing call, follow its structural evidence edge, and check the confidence label.
        await page.evaluate(() => (window as any).__contractDemo.select('verify'));
        await page.locator('#detail .connection[data-id="failure"]').click();
        await expect(page.locator('#detail h2')).toHaveText('expected 12 to equal 13');
        await expect(page.locator('#detail .connection[data-id="retry"]')).toHaveAttribute(
            'data-confidence',
            'structural',
        );
        await page.locator('#detail .connection[data-id="retry"]').click();
        await expect(page.locator('#detail h2')).toHaveText('retry #1');

        expect(await page.evaluate(() => (window as any).__contractDemo.trail())).toEqual([
            'Reconcile invoice totals',
            'grep',
            'test billing',
            'expected 12 to equal 13',
            'retry #1',
        ]);
        await page.locator('[data-role="trail-back"]').click();
        await expect(page.locator('#detail h2')).toHaveText('expected 12 to equal 13');

        noErrors(errors);
    });

    test('renders the second-host fixture and honours RTL markup', async ({ page }) => {
        const errors = await boot(page);

        await page.locator('#scene-host').click();
        await expect(page.locator('#detail h2')).toHaveText('Refactor billing');
        expect(await page.evaluate(() => (window as any).__contractDemo.nodeCount())).toBe(8);
        await expect(page.locator('#canvas .spacegraph-html-node')).toHaveCount(4);
        await expect(page.locator('#canvas')).toContainText('grep invoices');

        await page.locator('#direction-rtl').click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('#canvas [dir="rtl"]').first()).toBeAttached();

        await page.locator('#direction-ltr').click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
        await page.locator('#scene-pipeline').click();
        expect(await page.evaluate(() => (window as any).__contractDemo.nodeCount())).toBe(14);

        noErrors(errors);
    });

    test('captures the light and dark theme states', async ({ page }) => {
        const errors = await boot(page);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.locator('#fit').click();
        await page.waitForTimeout(800);
        mkdirSync(SHOT_DIR, { recursive: true });

        await page.locator('#theme-light').click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        await page.waitForTimeout(500);
        await page.screenshot({ path: resolve(SHOT_DIR, '09-contract-demo-light.png') });

        await page.locator('#theme-dark').click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await page.waitForTimeout(500);
        await page.screenshot({ path: resolve(SHOT_DIR, '10-contract-demo-dark.png') });

        noErrors(errors);
    });
});
