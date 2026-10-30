import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

// T6.12 — the second host: a plain-TypeScript app that mounts the library's contract and its three
// renderers, and runs every generic module against a model of its own. Served by the repo vite
// (`root: demo`), so the page is `/second-host.html`.
// Use PLAYWRIGHT_BASE_URL from playwright.config.ts which defaults to http://localhost:5173
const BASE_URL =
    process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${process.env.SG_DEMO_PORT ?? 5173}`;
const SHOT_DIR =
    process.env.SECOND_HOST_SHOTS ?? resolve(process.cwd(), '../docs/spacegraph/screenshots');

const CAPABILITIES = [
    'theme',
    'renderers',
    'adapter',
    'levels',
    'layout',
    'placements',
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
    await page.goto('/second-host.html');
    await page.waitForFunction(() => (window as any).__ready === true);
    await page.evaluate(() => document.fonts.ready);
    return errors;
}

const noErrors = (errors: string[]) =>
    expect(errors.filter((error) => !error.includes('favicon'))).toEqual([]);

test.describe('the second host (T6.12)', () => {
    test('mounts the renderer and lists every capability', async ({ page }) => {
        const errors = await boot(page);

        await expect(page.locator('[data-renderer="spacegraph"]')).toBeVisible();
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('[data-capability]')).toHaveCount(CAPABILITIES.length);
        await expect(page.locator('[data-capability="theme"]')).toContainText(
            '@spacegraphjs/renderer',
        );

        noErrors(errors);
    });

    test('runs every capability and reports what it produced', async ({ page }) => {
        const errors = await boot(page);

        expect(await page.evaluate(() => (window as any).__secondHost.capabilities())).toEqual(
            CAPABILITIES,
        );

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

        expect(await page.evaluate(() => (window as any).__secondHost.selection())).toEqual([
            'test:unit',
        ]);
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

    test('draws the same pipeline as a tree and as a force simulation', async ({ page }) => {
        const errors = await boot(page);

        await page.locator('[data-capability="placements"]').click();

        const evidence = await page.evaluate(() => (window as any).__secondHost.evidence());
        expect(evidence.join(' ')).toContain('tree');
        expect(evidence.join(' ')).toContain('force');
        expect(await page.evaluate(() => (window as any).__secondHost.view())).toBe('tree');

        await page.locator('[data-view="force"]').click();
        expect(await page.evaluate(() => (window as any).__secondHost.view())).toBe('force');
        await expect(page.locator('#state')).toContainText('force');

        noErrors(errors);
    });

    test('keeps the framed content clear of the minimap drawn over the canvas', async ({
        page,
    }) => {
        const errors = await boot(page);

        // The camera flies to a new frame over 1.5s, so the frame is measured once it has settled.
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(2_200);

        // T6.10: the minimap is chrome over the canvas, so the fit keeps the content out of its way.
        // The force layout spreads over the whole stage, so it is the view that reaches the corner.
        await page.locator('[data-view="force"]').click();
        await page.waitForTimeout(2_200);

        const overlap = await page.evaluate(() => {
            const minimap = document.querySelector<SVGSVGElement>('#minimap');
            if (!minimap) return -1;
            const map = minimap.getBoundingClientRect();
            let total = 0;
            for (const card of document.querySelectorAll<HTMLElement>('.html-node-container')) {
                const rect = card.getBoundingClientRect();
                const width = Math.min(rect.right, map.right) - Math.max(rect.left, map.left);
                const height = Math.min(rect.bottom, map.bottom) - Math.max(rect.top, map.top);
                if (width > 0 && height > 0) total += width * height;
            }
            return total;
        });

        expect(overlap).toBe(0);

        noErrors(errors);
    });

    test('captures the gallery for the review packet', async ({ page }) => {
        const errors = await boot(page);

        // The camera flies to a new frame over 1.5s, so a capture taken sooner catches it mid-flight.
        const SETTLED = 2_200;

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(SETTLED);
        mkdirSync(SHOT_DIR, { recursive: true });
        await page.screenshot({ path: resolve(SHOT_DIR, '26-second-host.png') });

        await page.locator('[data-capability="layout"]').click();
        await page.waitForTimeout(SETTLED);
        await page.screenshot({ path: resolve(SHOT_DIR, '27-second-host-lanes.png') });

        await page.locator('[data-view="tree"]').click();
        await page.waitForTimeout(SETTLED);
        await page.screenshot({ path: resolve(SHOT_DIR, '26-second-host-tree.png') });

        await page.locator('[data-view="force"]').click();
        await page.waitForTimeout(SETTLED);
        await page.screenshot({ path: resolve(SHOT_DIR, '26-second-host-force.png') });

        noErrors(errors);
    });
});
