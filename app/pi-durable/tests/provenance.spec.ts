import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

const FOCUS_ID = 'd:1:task:2';

test('inspector explains why a committed node is here', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'reveal', FOCUS_ID);
    await expect(page.locator('#inspector')).toContainText('why is this here?');
    await expect(page.locator('#inspector')).toContainText(`source node:${FOCUS_ID}`);
    await expect(page.locator('#inspector')).toContainText('edges');
    await call(page, 'lens', 'why');
    await expect(page.locator('#announcer')).toContainText('came from commit');
    expect(errors).toEqual([]);
});

test('a focused address survives a compact permalink reload', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'focus', FOCUS_ID);
    expect((await call<{ focus?: string }>(page, 'address')).focus).toBe(FOCUS_ID);
    const compact = await call<string>(page, 'compactAddress');
    await boot(page, compact);
    expect((await call<{ focus?: string }>(page, 'address')).focus).toBe(FOCUS_ID);
    await expect(page.locator('#inspector')).toContainText(FOCUS_ID);
    expect(errors).toEqual([]);
});
