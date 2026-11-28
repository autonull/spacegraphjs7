import { expect, test } from '@playwright/test';
import { demoPath } from '../../app/demo/src/registry.js';

test('dev session atlas reuses the scrubber for replay, travel and event windows', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(demoPath('dev-session'));
    const atlas = page.locator('#atlas .atlas-panel');
    await expect(atlas).toBeVisible();
    await expect(atlas.locator('[data-atlas-event]')).toHaveCount(14);
    await expect(atlas.locator('[data-atlas-step]')).toHaveText('14/14');

    await atlas.locator('[data-atlas-scrub]').evaluate((input: HTMLInputElement) => {
        input.value = '5';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(atlas.locator('[data-atlas-step]')).toHaveText('5/14');
    await expect(atlas.locator('[data-atlas-event][data-visible="false"]')).toHaveCount(9);

    await page.keyboard.press('ArrowRight');
    await expect(atlas.locator('[data-atlas-step]')).toHaveText('6/14');

    await atlas.locator('[data-atlas-action="play"]').click();
    await expect
        .poll(() => atlas.locator('[data-atlas-step]').innerText(), { timeout: 5_000 })
        .toBe('14/14');
    await expect(atlas.locator('[data-atlas-action="play"]')).toHaveAttribute('data-on', 'false');

    await atlas.locator('[data-atlas-action="travel:event-01|event-02"]').click();
    expect(
        await page.evaluate(
            () =>
                (
                    window as unknown as { _atlas: () => { travel?: { from: string; to: string } } }
                )._atlas().travel,
        ),
    ).toEqual({ from: 'event-01', to: 'event-02' });
    await expect
        .poll(
            () =>
                page.evaluate(
                    () =>
                        (window as unknown as { _atlas: () => { travel?: unknown } })._atlas()
                            .travel === undefined,
                ),
            { timeout: 3_000 },
        )
        .toBe(true);

    await atlas.locator('[data-atlas-action="window:event-03"]').click();
    await expect(atlas.locator('[data-atlas-window="event-03"]')).toBeVisible();
    await expect(page.locator('#app [data-node-id="window-event-03"]')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(atlas.locator('[data-atlas-window]')).toHaveCount(0);
    await expect(page.locator('#app [data-node-id="window-event-03"]')).toHaveCount(0);
    await atlas.locator('[data-atlas-action="stop"]').click();
    await expect(atlas.locator('[data-atlas-step]')).toHaveText('14/14');
    expect(errors).toEqual([]);
});
