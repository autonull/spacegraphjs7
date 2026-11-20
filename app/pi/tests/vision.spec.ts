import { expect, test, type Page } from '@playwright/test';
import { createVisionAssert } from '../../../src/vision/assert';

const DEPTHS = ['flat', 'layered', 'depth-stack', 'orbit'] as const;
const ARRANGEMENTS = ['stacked', 'side', 'floating'] as const;

const boot = async (page: Page): Promise<void> => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#status')).not.toHaveText('connecting…');
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.simulation().settled), { timeout: 10_000 })
        .toBe(true);
};

const assertScene = async (page: Page): Promise<void> => {
    const vision = createVisionAssert(page);
    await vision.noOverlap();
    await vision.isLegible();
    await vision.expectedLayoutScore(35);
};

test.describe('Pi flagship vision atlas', () => {
    for (const depth of DEPTHS) {
        test(`depth ${depth} passes the vision gates in every arrangement`, async ({ page }) => {
            const errors: string[] = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await boot(page);
            await page.evaluate((mode) => (window as any).__pi.setDepth(mode), depth);
            for (const arrangement of ARRANGEMENTS) {
                await page.evaluate((value) => (window as any).__pi.setArrangement(value), arrangement);
                await page.evaluate(() => (window as any).__pi.settle());
                await assertScene(page);
            }
            expect(errors).toEqual([]);
        });
    }

    test('reduced motion and failure contexts stay legible', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await boot(page);
        await page.evaluate(() => (window as any).__pi.loadFixture());
        await page.evaluate(() => (window as any).__pi.settle());
        await assertScene(page);
        expect(await page.evaluate(() => (window as any).__pi.attention().failures)).toBeGreaterThan(0);
    });

    test('a large stream with a 60-turn window stays legible', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => (window as any).__pi.loadFixture());
        await page.evaluate(() => (window as any).__pi.setWindowSize(1));
        await page.evaluate(() => (window as any).__pi.settle());
        await assertScene(page);
        expect(await page.evaluate(() => (window as any).__pi.hidden())).toBeGreaterThan(0);
    });

    test('the lane scope inside a freeform parent stays legible', async ({ page }) => {
        await boot(page);
        const scope = await page.evaluate(() =>
            (window as any).__pi.scopes().find((id: string) => id.startsWith('unit-')),
        );
        await page.evaluate((id) => (window as any).__pi.setLaneScope(id), scope);
        await page.evaluate(() => (window as any).__pi.settle());
        await assertScene(page);
    });
});
