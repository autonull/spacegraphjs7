import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

// T6.12 — the second host: a plain-TypeScript app that mounts the library's contract and its three
// renderers, and runs every generic module against a model of its own. Served by the repo vite
// (`root: demo`), so the page is `/second-host.html`.
const BASE_URL = process.env.SG_DEMO_URL ?? `http://localhost:${process.env.SG_DEMO_PORT ?? 5173}`;
const SHOT_DIR = process.env.SECOND_HOST_SHOTS ?? resolve(process.cwd(), '../docs/spacegraph/screenshots');

const CAPABILITIES = [
    'contract',
    'theme',
    'renderers',
    'adapter',
    'levels',
    'layout',
    'representations',
    'navigation',
    'bands',
    'a11y',
    'depth',
    'overlay',
    'diff',
];

async function boot(page: Page) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`${BASE_URL}/second-host.html`);
    await page.waitForFunction(() => (window as any).__ready === true);
    await page.evaluate(() => document.fonts.ready);
    return errors;
}

const noErrors = (errors: string[]) => expect(errors.filter((error) => !error.includes('favicon'))).toEqual([]);

test.describe('the second host (T6.12)', () => {
    test('mounts the renderer and lists every capability', async ({ page }) => {
        const errors = await boot(page);

        await expect(page.locator('[data-renderer="spacegraph"]')).toBeVisible();
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('[data-capability]')).toHaveCount(CAPABILITIES.length);
        await expect(page.locator('[data-capability="contract"]')).toContainText('@spacegraphjs/renderer');

        noErrors(errors);
    });

    test('runs every capability and reports what it produced', async ({ page }) => {
        const errors = await boot(page);

        expect(await page.evaluate(() => (window as any).__secondHost.capabilities())).toEqual(CAPABILITIES);

        for (const id of CAPABILITIES) {
            await page.locator(`[data-capability="${id}"]`).click();
            const evidence = await page.evaluate(() => (window as any).__secondHost.evidence());
            expect(evidence.length, id).toBeGreaterThan(0);
            for (const line of evidence) expect(line.trim(), id).not.toBe('');
        }

        await expect(page.locator('[data-role="evidence"] .evidence-line').first()).toBeVisible();

        noErrors(errors);
    });

    test('switches renderers over the same model', async ({ page }) => {
        const errors = await boot(page);

        await page.locator('#renderer-cytoscape').click();
        await expect(page.locator('#stage')).toHaveAttribute('data-renderer', 'cytoscape');
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });

        await page.locator('#renderer-svg').click();
        await expect(page.locator('#stage')).toHaveAttribute('data-renderer', 'svg');
        await expect(page.locator('#svg svg')).toBeVisible();
        await expect(page.locator('#svg')).toContainText('Scope the release');

        await page.locator('#renderer-spacegraph').click();
        await expect(page.locator('#stage')).toHaveAttribute('data-renderer', 'spacegraph');

        noErrors(errors);
    });

    test('opens the scoped overlay and closes it with Escape', async ({ page }) => {
        const errors = await boot(page);

        await page.locator('[data-capability="overlay"]').click();
        await expect(page.locator('#overlay')).toBeVisible();
        await expect(page.locator('#overlay-body')).toContainText('expected 12 to equal 13');
        await expect(page.locator('#overlay-body')).not.toContainText('npm publish');

        await page.keyboard.press('Escape');
        await expect(page.locator('#overlay')).toBeHidden();

        noErrors(errors);
    });

    test('shows the code diff as text, never as markup', async ({ page }) => {
        const errors = await boot(page);

        await page.locator('[data-capability="diff"]').click();
        await expect(page.locator('#diff')).toBeVisible();
        await expect(page.locator('#diff')).toContainText('src/billing/totals.ts');
        await expect(page.locator('#diff [data-tone="added"]').first()).toBeVisible();
        expect(await page.locator('#diff script').count()).toBe(0);

        noErrors(errors);
    });

    test('searches the host model and selects a node', async ({ page }) => {
        const errors = await boot(page);

        await page.locator('#search').fill('vitest');
        await expect(page.locator('#results .result')).toHaveCount(2);
        await page.locator('#results .result').first().click();

        expect(await page.evaluate(() => (window as any).__secondHost.selection())).toEqual(['test:unit']);
        await expect(page.locator('#trail')).toContainText('vitest run');

        noErrors(errors);
    });

    test('draws the overview of the pipeline in the minimap', async ({ page }) => {
        const errors = await boot(page);

        await expect(page.locator('#minimap .dot')).toHaveCount(13);
        await expect(page.locator('#minimap .dot[data-id="test:failure"]')).toBeAttached();

        await page.locator('[data-capability="layout"]').click();
        await expect(page.locator('#minimap .dot')).toHaveCount(18);

        noErrors(errors);
    });

    test('captures the gallery for the review packet', async ({ page }) => {
        const errors = await boot(page);

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(600);
        mkdirSync(SHOT_DIR, { recursive: true });
        await page.screenshot({ path: resolve(SHOT_DIR, '26-second-host.png') });

        await page.locator('[data-capability="layout"]').click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: resolve(SHOT_DIR, '27-second-host-lanes.png') });

        noErrors(errors);
    });
});
