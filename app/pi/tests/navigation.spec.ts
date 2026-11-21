import { expect, test, type Page } from '@playwright/test';

const boot = async (page: Page): Promise<void> => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#status')).not.toHaveText('connecting…');
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.portalNodes().length), { timeout: 10_000 })
        .toBeGreaterThan(0);
};

const kinds = async (page: Page): Promise<string[]> =>
    page.evaluate(() => (window as any).__pi.recording().events.map((event: any) => event.kind));

test.describe('the navigation grammar', () => {
    test('keyboard verbs are interruptible and all return home in one keystroke', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await boot(page);
        await page.locator('#canvas').focus();

        await page.keyboard.press('PageDown');
        await expect(page.locator('[data-portal][data-descending="true"]')).toHaveCount(1, { timeout: 3000 });
        await page.keyboard.press('t');
        await page.keyboard.press('PageUp');
        await page.keyboard.press('Escape');
        await expect(page.locator('#surface')).toHaveAttribute('data-surface', 'hybrid');

        const recorded = await kinds(page);
        expect(recorded).toContain('descend');
        expect(recorded).toContain('ascend');
        expect(recorded).toContain('trace');
        expect(recorded).toContain('escape-hatch');
        const counters = await page.evaluate(() => (window as any).__pi.ergonomics());
        expect(counters.descend).toBeGreaterThan(0);
        expect(counters['escape-hatch']).toBeGreaterThan(0);
        expect(errors).toEqual([]);
    });

    test('zoom reversals, trail backtracks and edge traverse are neutral signals', async ({ page }) => {
        await boot(page);
        await page.locator('#canvas').focus();
        await page.keyboard.press('+');
        await page.keyboard.press('-');
        await page.keyboard.press('ArrowLeft');
        await page.evaluate(() => (window as any).__pi.reveal((window as any).__pi.edges()[0].target));
        await page.evaluate(() => (window as any).__pi.trailBack());
        const edge = await page.evaluate(() => (window as any).__pi.edges()[0]);
        const target = await page.evaluate((id) => (window as any).__pi.traverseEdge(id), edge.id);
        expect(target).toBe(edge.target);

        const counters = await page.evaluate(() => (window as any).__pi.ergonomics());
        expect(counters['zoom-oscillation']).toBeGreaterThan(0);
        expect(counters['trail-backtrack']).toBeGreaterThan(0);
        expect(counters.traverse).toBeGreaterThan(0);
    });

    test('reduced motion keeps the verb set usable and non-animated', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await boot(page);
        const active = await page.evaluate(() => (window as any).__pi.motion().active);
        expect(Array.isArray(active)).toBe(true);
        await page.locator('#canvas').focus();
        await page.keyboard.press('PageDown');
        await page.keyboard.press('Escape');
        const recorded = await kinds(page);
        expect(recorded).toContain('descend');
        expect(recorded).toContain('escape-hatch');
    });
});
