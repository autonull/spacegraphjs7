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
        await page.keyboard.press('s');
        await page.keyboard.press('PageUp');
        await page.keyboard.press('Escape');
        await expect(page.locator('#surface')).toHaveAttribute('data-surface', 'hybrid');

        const recorded = await kinds(page);
        expect(recorded).toContain('descend');
        expect(recorded).toContain('ascend');
        expect(recorded).toContain('trace');
        expect(recorded).toContain('survey');
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

    test('touch gestures reach the same verb set as the keyboard', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await boot(page);
        await page.evaluate(() => {
            const canvas = document.querySelector('#canvas')!;
            const fire = (type: string, x: number, y: number) =>
                canvas.dispatchEvent(
                    new PointerEvent(type, { pointerType: 'touch', clientX: x, clientY: y, bubbles: true }),
                );
            fire('pointerdown', 120, 120);
            fire('pointerup', 120, 120);
            fire('pointerdown', 124, 122);
            fire('pointerup', 124, 122);
        });
        await expect.poll(async () => (await kinds(page)).includes('descend')).toBe(true);
        expect(errors).toEqual([]);
    });

    test('exactly one index is primary per surface', async ({ page }) => {
        await boot(page);
        await expect(page.locator('#surface')).toHaveAttribute('data-primary-index', 'transcript');
        await expect(page.locator('#transcript')).toBeVisible();
        await expect(page.locator('#rail-navigate')).not.toHaveAttribute('open', '');

        await page.evaluate(() => (window as any).__pi.setSurface('map'));
        await expect(page.locator('#surface')).toHaveAttribute('data-surface', 'map');
        await expect(page.locator('#surface')).toHaveAttribute('data-primary-index', 'graph');
        await expect(page.locator('#transcript')).toBeHidden();

        await page.evaluate(() => (window as any).__pi.setSurface('hybrid'));
        await expect(page.locator('#surface')).toHaveAttribute('data-primary-index', 'transcript');
    });

    test('keyboard and palette reach every secondary index', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await boot(page);
        await page.locator('#canvas').focus();
        await page.keyboard.press('n');
        await expect(page.locator('#rail-navigate')).toHaveAttribute('open', '');

        for (const label of ['Scopes', 'Turn map', 'Trail', 'Portal path', 'Minimap']) {
            await page.locator('#command-open').click();
            await page.locator('#command-input').fill(`Navigate · ${label}`);
            await page.locator('.command-row').first().click();
            await expect(page.locator('#rail-navigate')).toHaveAttribute('open', '');
        }
        const opened = await page.evaluate(() =>
            (window as any).__pi
                .recording()
                .events.filter((event: any) => event.kind === 'navigate:open')
                .map((event: any) => event.meta.index),
        );
        expect(opened).toEqual(
            expect.arrayContaining([
                'overview',
                'turn-map',
                'trail-list',
                'portal-crumb',
                'minimap',
            ]),
        );
        expect(errors).toEqual([]);
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
