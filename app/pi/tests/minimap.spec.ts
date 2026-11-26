import { expect, test } from '@playwright/test';
import { boot } from './boot';

test('the overview reaches every node by keyboard', async ({ page }) => {
    await boot(page);
    const dots = page.locator('#minimap [data-minimap-node]');
    expect(await dots.count()).toBeGreaterThan(1);

    const container = page.locator('#minimap');
    await page.evaluate(() => (window as any).__pi.openNavigate());
    await container.focus();
    await expect(container).toBeFocused();
    const first = await dots.first().getAttribute('data-minimap-node');
    await expect(container).toHaveAttribute(
        'aria-activedescendant',
        `minimap-node-${first?.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    );

    await page.keyboard.press('ArrowRight');
    const target = await dots.nth(1).getAttribute('data-minimap-node');
    await expect(container).toHaveAttribute(
        'aria-activedescendant',
        `minimap-node-${target?.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    );

    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__pi.revealed())).toBe(target);

    await page.keyboard.press('End');
    const last = await dots.last().getAttribute('data-minimap-node');
    await expect(container).toHaveAttribute(
        'aria-activedescendant',
        `minimap-node-${last?.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    );
    await page.keyboard.press('ArrowRight');
    await expect(container).toHaveAttribute(
        'aria-activedescendant',
        `minimap-node-${first?.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    );
});

test('the minimap command focuses the overview', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => (window as any).__pi.openIndex('minimap'));
    await expect(page.locator('#minimap')).toBeFocused();
});
