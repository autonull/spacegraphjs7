import { expect, test } from '@playwright/test';
import { boot } from './boot';

test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await boot(page, '?shot=fractal');
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

test('inner chips reveal their full name on focus', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/?shot=recursion');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    const chip = page.locator('#focus-lens .focus-chip').first();
    const name = chip.locator('.focus-chip-name');
    const label = (await name.textContent())?.trim() ?? '';
    expect(label.length).toBeGreaterThan(1);
    await expect(name).toBeHidden();
    await chip.locator('[data-node-action="focus"]').first().focus();
    await expect(name).toBeVisible();
    expect((await name.textContent())?.trim()).toBe(label);
});

test('the lens leaves its source card readable in the node-detail shot', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/?shot=node-detail');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#canvas canvas').first()).toBeVisible();
    await page.evaluate(() => (window as any).__pi.settle());
    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    const lens = document.querySelector('#focus-lens')!.getBoundingClientRect();
                    const focus = (window as any).__pi.revealed();
                    const card = document.getElementById(`node-html-${focus}`)?.getBoundingClientRect();
                    if (!card) return 1;
                    const width = Math.max(
                        0,
                        Math.min(lens.right, card.right) - Math.max(lens.left, card.left),
                    );
                    const height = Math.max(
                        0,
                        Math.min(lens.bottom, card.bottom) - Math.max(lens.top, card.top),
                    );
                    return (width * height) / Math.min(lens.width * lens.height, card.width * card.height);
                }),
            { timeout: 8000 },
        )
        .toBeLessThan(0.1);
});
