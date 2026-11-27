import { expect, test } from '@playwright/test';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { boot, noErrors } from '../../../test/e2e/atlas-kit.js';

// T6.12 — the demo host: a plain-TypeScript app that mounts the library's contract and its three
// renderers, and runs every generic module against a model of its own. Served by app/demo's own
// vite (`root: app/demo`), so the page is `/`.
const SHOT_DIR = process.env.DEMO_SHOTS ?? resolve(process.cwd(), '../docs/spacegraph/screenshots');

test.describe('the demo host (T6.12)', () => {
    test('mounts the renderer and lists every capability', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });
        const capabilities = await page.evaluate(() => (window as any).__demo.capabilities());

        await expect(page.locator('[data-renderer="spacegraph"]')).toBeVisible();
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('[data-capability]')).toHaveCount(capabilities.length);
        await expect(page.locator('[data-capability="theme"]')).toHaveAttribute(
            'title',
            /@spacegraphjs\/renderer/,
        );

        noErrors(errors);
    });

    test('frames the opening cards at reading scale', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });

        await expect(page.locator('#fit-read')).toBeVisible();
        await page.locator('#fit-read').click();
        await page.locator('#fit-all').click();

        noErrors(errors);
    });

    test('keeps the gallery, canvas and inspector usable on a narrow viewport', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 900, height: 700 });
        const errors = await boot(page, '/', { viewport: false });

        await expect(page.locator('#gallery')).toBeVisible();
        await expect(page.locator('#minimap')).toBeHidden();
        await expect(page.locator('#evidence')).toBeVisible();
        const stage = (await page.locator('#stage').boundingBox())!;
        expect(stage.width).toBeGreaterThan(800);

        noErrors(errors);
    });

    test('runs every capability and reports what it produced', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });

        const capabilities = await page.evaluate(() => (window as any).__demo.capabilities());
        expect(capabilities.length).toBeGreaterThan(0);

        for (const id of capabilities) {
            await page.locator(`[data-capability="${id}"]`).click();
            const evidence = await page.evaluate(() => (window as any).__demo.evidence());
            expect(evidence.length, id).toBeGreaterThan(0);
            for (const line of evidence) expect(line.trim(), id).not.toBe('');
        }

        await expect(page.locator('[data-role="evidence"] .evidence-line').first()).toBeVisible();

        noErrors(errors);
    });

    test('switches renderers over the same model', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });

        await page.locator('#renderer-cytoscape').click();
        await expect(page.locator('#stage')).toHaveAttribute('data-renderer', 'cytoscape');
        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });

        await page.locator('#renderer-svg').click();
        await expect(page.locator('#stage')).toHaveAttribute('data-renderer', 'svg');
        await expect(page.locator('#state')).toContainText('static — no pan, zoom or selection');
        await expect(page.locator('#svg svg')).toBeVisible();
        await expect(page.locator('#svg')).toContainText('Scope the release');

        await page.locator('#renderer-spacegraph').click();
        await expect(page.locator('#stage')).toHaveAttribute('data-renderer', 'spacegraph');

        noErrors(errors);
    });

    test('opens the scoped overlay and closes it with Escape', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });

        await page.locator('[data-capability="overlay"]').click();
        await expect(page.locator('#overlay')).toBeVisible();
        await expect(page.locator('#overlay-body')).toContainText('expected 12 to equal 13');
        await expect(page.locator('#overlay-body')).not.toContainText('npm publish');

        await page.keyboard.press('Escape');
        await expect(page.locator('#overlay')).toBeHidden();

        noErrors(errors);
    });

    test('shows the code diff as text, never as markup', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });

        await page.locator('[data-capability="diff"]').click();
        await expect(page.locator('#diff')).toBeVisible();
        await expect(page.locator('#diff')).toContainText('src/billing/totals.ts');
        await expect(page.locator('#diff [data-tone="added"]').first()).toBeVisible();
        expect(await page.locator('#diff script').count()).toBe(0);

        noErrors(errors);
    });

    test('searches the host model and selects a node', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });

        await page.locator('#search').fill('vitest');
        await expect(page.locator('#results .result')).toHaveCount(2);
        await page.locator('#results .result').first().click();

        expect(await page.evaluate(() => (window as any).__demo.selection())).toEqual([
            'test:unit',
        ]);
        await expect(page.locator('#trail')).toContainText('vitest run');

        noErrors(errors);
    });

    test('Enter selects the first search result without an arrow key', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });
        await page.locator('#search').fill('vitest');
        await expect(page.locator('#search-status')).toContainText('2 matches');
        await page.locator('#search').press('Enter');
        expect(await page.evaluate(() => (window as any).__demo.selection())).toEqual([
            'test:unit',
        ]);
        await expect(page.locator('#results .result').first()).toHaveAttribute(
            'aria-selected',
            'true',
        );
        noErrors(errors);
    });

    test('navigates the canvas from the minimap', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });
        const before = await page.evaluate(() => (window as any).__demo.viewport());
        const box = (await page.locator('#minimap').boundingBox())!;
        await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.3);
        const after = await page.evaluate(() => (window as any).__demo.viewport());

        expect(after.center).not.toEqual(before.center);
        noErrors(errors);
    });

    test('navigates the canvas from the focused minimap', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });
        const before = await page.evaluate(() => (window as any).__demo.viewport());
        await page.locator('#minimap').focus();
        await page.keyboard.press('ArrowRight');
        const after = await page.evaluate(() => (window as any).__demo.viewport());

        expect(after.center).not.toEqual(before.center);
        noErrors(errors);
    });

    test('navigates search results with the keyboard', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });
        await page.locator('#search').fill('vitest');
        await expect(page.locator('#search-status')).toContainText('2 matches');

        await page.locator('#search').press('ArrowDown');
        await expect(page.locator('#results .result').first()).toHaveAttribute(
            'aria-selected',
            'true',
        );
        await page.locator('#search').press('Enter');
        expect(await page.evaluate(() => (window as any).__demo.selection())).toEqual([
            'test:unit',
        ]);

        await page.locator('#search').press('Escape');
        await expect(page.locator('#results .result')).toHaveCount(0);
        noErrors(errors);
    });

    test('draws the overview of the pipeline in the minimap', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });
        const dots = page.locator('#minimap .dot');

        const before = await dots.count();
        expect(before).toBeGreaterThan(0);
        expect(before).toBeLessThanOrEqual(100);
        await expect(page.locator('#minimap .dot[data-id="test:failure"]')).toBeAttached();

        await page.locator('[data-capability="layout"]').click();
        await expect.poll(() => dots.count()).toBeGreaterThan(before);
        expect(await dots.count()).toBeLessThanOrEqual(100);

        noErrors(errors);
    });

    test('draws the same pipeline as a tree and as a force simulation', async ({ page }) => {
        const errors = await boot(page, '/', { viewport: false });

        await page.locator('[data-capability="placements"]').click();

        const evidence = await page.evaluate(() => (window as any).__demo.evidence());
        expect(evidence.join(' ')).toContain('tree');
        expect(evidence.join(' ')).toContain('force');
        expect(await page.evaluate(() => (window as any).__demo.view())).toBe('tree');

        await page.locator('[data-view="force"]').click();
        expect(await page.evaluate(() => (window as any).__demo.view())).toBe('force');
        await expect(page.locator('#state')).toContainText('force');

        noErrors(errors);
    });

    test('keeps the framed content clear of the minimap drawn over the canvas', async ({
        page,
    }) => {
        const errors = await boot(page, '/', { viewport: false });

        await page.setViewportSize({ width: 1440, height: 900 });

        // T6.10: the minimap is chrome over the canvas, so the fit keeps the content out of its way.
        // Poll the settled frame instead of sleeping: camera and layout timing vary by host.
        await page.locator('[data-view="force"]').click();
        const overlap = () =>
            page.evaluate(() => {
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

        await expect
            .poll(overlap, { timeout: 5_000, intervals: [100, 250, 500] })
            .toBeLessThan(200);

        noErrors(errors);
    });

    test('captures the gallery for the review packet', async ({ page }) => {
        test.skip(
            !process.env.DEMO_SHOTS,
            'capture-only: set DEMO_SHOTS to regenerate the review packet',
        );

        const errors = await boot(page, '/', { viewport: false });

        // The camera flies to a new frame over 1.5s, so a capture taken sooner catches it mid-flight.
        const SETTLED = 1_500;

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(SETTLED);
        mkdirSync(SHOT_DIR, { recursive: true });
        await page.screenshot({ path: resolve(SHOT_DIR, '26-demo.png') });

        // v39 lifts: capture each new capability visualization
        const CAPABILITY_SCREENSHOTS: Array<[string, string]> = [
            ['trace', '27-demo-trace.png'],
            ['focus', '27-demo-focus.png'],
            ['collapse', '27-demo-collapse.png'],
            ['facets', '27-demo-facets.png'],
            ['time-travel', '27-demo-time-travel.png'],
            ['spatial-memory', '27-demo-spatial-memory.png'],
            ['overlay', '27-demo-overlay.png'],
            ['diff', '27-demo-diff.png'],
        ];

        for (const [capability, filename] of CAPABILITY_SCREENSHOTS) {
            await page.locator(`[data-capability="${capability}"]`).click();
            await page.waitForTimeout(SETTLED);
            await page.screenshot({ path: resolve(SHOT_DIR, filename) });
        }

        await page.locator('[data-capability="layout"]').click();
        await page.waitForTimeout(SETTLED);
        await page.screenshot({ path: resolve(SHOT_DIR, '27-demo-lanes.png') });

        await page.locator('[data-view="tree"]').click();
        await page.waitForTimeout(SETTLED);
        await page.screenshot({ path: resolve(SHOT_DIR, '26-demo-tree.png') });

        await page.locator('[data-view="force"]').click();
        await page.waitForTimeout(SETTLED);
        await page.screenshot({ path: resolve(SHOT_DIR, '26-demo-force.png') });

        noErrors(errors);
    });
});
