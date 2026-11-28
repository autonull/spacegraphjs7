import { expect, test } from '@playwright/test';
import { bootConsole, call, settle } from './boot';

test('continuous fidelity follows zoom and snaps under reduced motion', async ({ page }) => {
    const errors = await bootConsole(page);
    const opacity = (): Promise<string> =>
        page
            .locator('#canvas')
            .evaluate((node) => (node as HTMLElement).style.getPropertyValue('--tg-fidelity-opacity'));

    await call(page, 'consolePresentation', { continuousFidelity: true });
    await expect.poll(opacity).not.toBe('');
    await call(page, 'zoomBy', 0.5);
    await settle(page);
    const zoomed = Number(await opacity());
    expect(zoomed).toBeGreaterThan(0.45);
    expect(zoomed).toBeLessThanOrEqual(1);
    expect(
        Number(
            await page
                .locator('#canvas .sg-terminal-line')
                .first()
                .evaluate((node) => getComputedStyle(node).opacity),
        ),
    ).toBeCloseTo(zoomed, 4);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await call(page, 'consoleLOD', 'detail');
    expect(Number(await opacity())).toBe(1);
    expect(
        await page
            .locator('#canvas .sg-terminal-line')
            .first()
            .evaluate((node) => node.getAnimations().length),
    ).toBe(0);

    const quality = await call<{ score: number }>(page, 'consoleQuality');
    expect(quality.score).toBeGreaterThanOrEqual(0);
    expect(errors).toEqual([]);
});
