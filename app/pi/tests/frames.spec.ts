import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/?shot=cockpit');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#canvas canvas').first()).toBeVisible();
});

const frame = (page: import('@playwright/test').Page) => page.locator('#state-frame');

test('a populated graph shows no state frame', async ({ page }) => {
    await expect(frame(page)).toBeHidden();
});

test('empty, pending and failed frames are legible and dismissible', async ({ page }) => {
    for (const [state, text] of [
        ['empty', 'No nodes yet'],
        ['pending', 'Waiting for events'],
        ['failed', 'Event source unavailable'],
    ] as const) {
        await page.evaluate((value) => (window as any).__pi.setFrame(value, 'stream offline'), state);
        await expect(frame(page)).toBeVisible();
        await expect(frame(page)).toHaveAttribute('data-state', state);
        await expect(frame(page)).toContainText(text);
    }
    await expect(frame(page)).toContainText('stream offline');
    await page.evaluate(() => (window as any).__pi.setFrame(null));
    await expect(frame(page)).toBeHidden();
});
