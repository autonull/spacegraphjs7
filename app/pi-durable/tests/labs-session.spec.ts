import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

type AtlasState = {
    readonly total: number;
    readonly prefix: number;
    readonly playing: boolean;
};

test('labs session atlas scrubs, replays, travels and promotes an event window', async ({
    page,
}) => {
    const errors = await boot(page, '?shot=basic-turn&labs=1');
    await page.keyboard.press('a');
    const panel = page.locator('#lab-atlas .atlas-panel');
    await expect(panel).toBeVisible();
    const total = await panel.locator('[data-atlas-event]').count();
    expect(total).toBeGreaterThan(1);
    expect((await call<AtlasState>(page, 'atlasState')).prefix).toBe(total);

    await panel.locator('[data-atlas-scrub]').evaluate((input: HTMLInputElement) => {
        input.value = '1';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(panel.locator('[data-atlas-step]')).toHaveText(`1/${total}`);
    expect((await call<{ readonly asOf?: number }>(page, 'address')).asOf).toBe(1);

    await panel.locator('[data-atlas-action="play"]').click();
    await expect
        .poll(async () => (await call<AtlasState>(page, 'atlasState')).prefix, { timeout: 10_000 })
        .toBe(total);
    expect((await call<AtlasState>(page, 'atlasState')).playing).toBe(false);

    await panel.locator('[data-atlas-action="stop"]').click();
    expect((await call<{ readonly asOf?: number }>(page, 'address')).asOf).toBeUndefined();

    await panel.locator('[data-atlas-action^="travel:"]').first().click();
    await expect(page.locator('#announcer')).toContainText('Travelled', { timeout: 3_000 });

    await panel.locator('[data-atlas-action^="window:"]').first().click();
    await expect(panel.locator('[data-atlas-window]')).toBeVisible();
    await panel.locator('[data-atlas-action="close"]').click();
    await expect(panel.locator('[data-atlas-window]')).toHaveCount(0);

    await page.keyboard.press('a');
    await expect(page.locator('#lab-atlas')).toBeHidden();
    expect(errors).toEqual([]);
});
