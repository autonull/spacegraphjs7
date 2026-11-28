import { expect, test } from '@playwright/test';
import { demoPath } from '../../app/demo/src/registry.js';

const watchErrors = (page: import('@playwright/test').Page) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });
    return errors;
};

test('zoom morph layout uses the shared density panel', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(demoPath('morph-layout'));
    const panel = page.locator('#density .density-panel');
    await expect(panel).toBeVisible();
    await page.evaluate(() => {
        (window as unknown as { _sg: { setZoom(zoom: number): void } })._sg.setZoom(0.2);
    });
    await expect(page.locator('#layout-name')).toHaveText('Ring');

    await page.evaluate(() => {
        (window as unknown as { _sg: { setZoom(zoom: number): void } })._sg.setZoom(0.5);
    });
    await expect(page.locator('#layout-name')).toHaveText('Two columns');
    await expect(panel.locator('[data-density-tool="morph"][data-on="true"]')).toHaveCount(1);
    await expect(panel).toContainText('grid');

    await page.keyboard.press('1');
    await expect(page.locator('#layout-name')).toHaveText('Ring');
    expect(errors).toEqual([]);
});

test('vector lens scopes, pins and releases by keyboard', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(demoPath('vector-lens'));
    const panel = page.locator('#density .density-panel');
    await expect(panel).toContainText('no focus');

    await page.keyboard.press('1');
    await expect(page.locator('#lens')).toHaveAttribute('data-open', 'true');
    await expect(page.locator('#lens-label')).toContainText('hub-0');
    await expect(panel).toContainText('focus hub-0');
    await page.locator('#app').click({ position: { x: 8, y: 8 } });
    expect(
        await page.evaluate(
            () => (window as unknown as { _density: () => { pinned: boolean } })._density().pinned,
        ),
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#lens')).toHaveAttribute('data-open', 'false');
    await expect(panel).toContainText('no focus');
    expect(errors).toEqual([]);
});

test('gather focus moves attention with arrow keys and restores on Escape', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(demoPath('gravity-focus'));
    const panel = page.locator('#density .density-panel');
    await expect(panel).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#focus')).toContainText('hub-0');
    await expect(panel).toContainText('focus hub-0');
    await expect(panel).toContainText('gathered');

    await page.keyboard.press('Escape');
    await expect(page.locator('#focus')).toContainText('no focus');
    expect(errors).toEqual([]);
});

test('lasso scope frames a brushed region and clears it', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(demoPath('lasso-scope'));
    const panel = page.locator('#density .density-panel');
    await expect(panel).toBeVisible();

    await panel.locator('[data-density-tool="lasso"]').click();
    await expect
        .poll(() =>
            page.evaluate(() =>
                (
                    window as unknown as { _sg: { graph: { nodes: Map<string, unknown> } } }
                )._sg.graph.nodes.has('lasso-frame'),
            ),
        )
        .toBe(true);
    await expect(page.locator('#scope-list')).not.toHaveText('none');

    await page.keyboard.press('Escape');
    expect(
        await page.evaluate(() =>
            (
                window as unknown as { _sg: { graph: { nodes: Map<string, unknown> } } }
            )._sg.graph.nodes.has('lasso-frame'),
        ),
    ).toBe(false);
    expect(errors).toEqual([]);
});
