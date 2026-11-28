import { expect, test } from '@playwright/test';
import { demoPath } from '../../app/demo/src/registry.js';

test('window desktop uses the shared shell for tabs, focus and compact band', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(demoPath('window-desktop'));
    const id = await page.locator('#app .gw-window').first().getAttribute('data-gw-window');
    const win = page.locator(`#app .gw-window[data-gw-window="${id}"]`);
    await expect(win).toBeVisible();

    await win
        .locator('[data-gw-action="tab:signals"]')
        .evaluate((button: HTMLElement) => button.click());
    await expect(win.locator('[data-gw-action="tab:signals"][data-on="true"]')).toHaveCount(1);
    await expect(win.locator('.gw-body')).toContainText('latency');

    await page
        .locator('#taskbar [data-gw-focus]')
        .first()
        .evaluate((button: HTMLElement) => button.click());
    await expect(page.locator('#taskbar [data-gw-focus]').first()).toHaveAttribute(
        'data-active',
        'true',
    );

    await page.evaluate(() => {
        (window as unknown as { _sg: { setZoom(zoom: number): void } })._sg.setZoom(0.02);
    });
    await expect(page.locator('#app .gw-compact').first()).toBeVisible();
    await expect(page.locator('#app .gw-tabs')).toHaveCount(0);
    expect(errors).toEqual([]);
});
