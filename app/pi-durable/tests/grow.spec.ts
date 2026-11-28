import { expect, test } from '@playwright/test';
import { bootConsole, call, settle } from './boot';

test('the console can be embedded as a node in the larger graph', async ({ page }) => {
    const errors = await bootConsole(page);
    await call(page, 'setView', 'graph');
    expect(await call<boolean>(page, 'consoleEmbed', true)).toBe(true);
    await settle(page);
    const node = page.locator('#canvas [data-node-id^="console:"]');
    await expect(node).toBeVisible();
    await call(page, 'reveal', (await node.getAttribute('data-node-id'))!);
    expect(await page.locator('#app').getAttribute('data-view')).toBe('transcript');
    expect(errors).toEqual([]);
});

test('a terminal line grows a bounded graph that can become the main graph', async ({ page }) => {
    const errors = await bootConsole(page);
    const seed = (await call<{ tail?: string }>(page, 'address')).tail;
    expect(seed).toBeTruthy();

    expect(await call<boolean>(page, 'consoleGrow', seed)).toBe(true);
    await settle(page);
    await expect(page.locator('#canvas .sg-grow')).toBeVisible();
    const chips = page.locator('#canvas .sg-grow-chip');
    expect(await chips.count()).toBeGreaterThan(0);
    expect(await page.locator('#canvas .sg-grow-canvas svg line').count()).toBe(await chips.count());

    const chipID = await chips.first().getAttribute('data-grow-id');
    expect(chipID).toBeTruthy();
    await chips.first().click();
    expect(await page.locator('#app').getAttribute('data-view')).toBe('graph');
    expect((await call<{ focus?: string }>(page, 'address')).focus).toBe(chipID);

    await call(page, 'setView', 'transcript');
    await settle(page);
    await expect(page.locator('#canvas .sg-grow')).toBeVisible();
    expect(await call<boolean>(page, 'consoleGrow', seed)).toBe(false);
    await expect(page.locator('#canvas .sg-grow')).toHaveCount(0);
    expect(errors).toEqual([]);
});
