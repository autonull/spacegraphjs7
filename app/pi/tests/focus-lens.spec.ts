import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/?shot=fractal');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#canvas canvas').first()).toBeVisible();
});

test('focus scaling is off by default', async ({ page }) => {
    const values = await page.evaluate(() => (window as any).__pi.policy().values);
    expect(values['emphasis.focusScale']).toBe(1);
    expect(values['emphasis.neighborScale']).toBe(1);
    expect(values['emphasis.contextScale']).toBe(1);
    expect(values['emphasis.innerDepth']).toBe(2);
});

test('the detail lens shows a bounded inner layout with controls', async ({ page }) => {
    await expect(page.locator('#focus-lens')).toBeVisible();
    const chips = page.locator('#focus-lens .focus-chip');
    expect(await chips.count()).toBeGreaterThan(0);
    expect(await chips.count()).toBeLessThanOrEqual(6);
    await expect(page.locator('#focus-lens .focus-actions button').first()).toBeVisible();
});

test('the actions tab offers 44px targets for the bounded chips', async ({ page }) => {
    const chips = await page.locator('#focus-lens .focus-chip').count();
    await page.locator('#focus-lens [data-tab-target="actions"]').click();
    const targets = page.locator('#focus-lens .focus-targets button');
    expect(await targets.count()).toBe(chips);
    const smallest = await targets.evaluateAll((buttons) =>
        Math.min(
            ...buttons.map((button) => {
                const rect = button.getBoundingClientRect();
                return Math.min(rect.width, rect.height);
            }),
        ),
    );
    expect(smallest).toBeGreaterThanOrEqual(44);
    const before = await page.evaluate(() => (window as any).__pi.revealed());
    await targets.first().click();
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.revealed()))
        .not.toBe(before);
});

test('lens controls show a visible keyboard focus ring', async ({ page }) => {
    const tab = page.locator('#focus-lens [data-tab-target="inner"]');
    await tab.focus();
    expect(await tab.evaluate((el) => getComputedStyle(el).outlineWidth)).not.toBe('0px');
});

test('a chip control focuses that node without resizing it', async ({ page }) => {
    const before = await page.evaluate(() => ({
        revealed: (window as any).__pi.revealed(),
        size: (window as any).__pi.viewport().zoom,
    }));
    await page.locator('#focus-lens .focus-chip [data-node-action="focus"]').first().click();
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.revealed()))
        .not.toBe(before.revealed);
    expect(await page.evaluate(() => (window as any).__pi.viewport().zoom)).toBe(before.size);
});
