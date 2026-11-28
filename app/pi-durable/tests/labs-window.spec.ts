import { expect, test } from '@playwright/test';
import { boot, call, settle } from './boot';

test('labs window shell switches tabs, focuses, scales and collapses', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn&labs=1');
    await call(page, 'zoomBy', 5);
    await settle(page);
    const node = page.locator('#canvas [data-node-id^="lab-window:"]');
    await expect(node.locator('.gw-window')).toBeVisible();
    await expect(page.locator('#lab-taskbar [data-gw-focus]')).toHaveCount(1);

    const body = node.locator('.gw-body');
    const detail = await body.innerText();
    await node.locator('[data-gw-action="tab:facts"]').click();
    await expect(body).not.toHaveText(detail);
    await expect(node.locator('[data-gw-action="tab:facts"][data-on="true"]')).toHaveCount(1);

    const task = page.locator('#lab-taskbar [data-gw-focus]');
    await task.click();
    await expect(task).toHaveAttribute('data-active', 'true');
    await expect(node.locator('.gw-window')).toHaveAttribute('data-focused', 'true');

    await node.locator('[data-gw-action="tab:actions"]').click();
    const fontSize = () =>
        node
            .locator('.gw-head')
            .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const small = await fontSize();
    await node.locator('[data-gw-action="max"]').click();
    expect(await fontSize()).toBeGreaterThan(small);
    await expect(node.locator('.gw-window')).toBeVisible();

    await call(page, 'zoomBy', 0.01);
    await settle(page);
    await expect(node.locator('.gw-compact')).toBeVisible();
    await expect(node.locator('.gw-tabs')).toHaveCount(0);
    expect(errors).toEqual([]);
});
