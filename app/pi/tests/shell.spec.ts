import { expect, test, type Page } from '@playwright/test';

const boot = async (page: Page): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.portalNodes().length), {
            timeout: 10_000,
        })
        .toBeGreaterThan(0);
    return errors;
};

test.describe('the one-surface shell', () => {
    test('injects tokens and keeps both themes resolvable', async ({ page }) => {
        const errors = await boot(page);
        const dark = await page.evaluate(() =>
            getComputedStyle(document.documentElement)
                .getPropertyValue('--sg-colors-background')
                .trim(),
        );
        expect(dark).toBe('#000000');
        await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
        const light = await page.evaluate(() =>
            getComputedStyle(document.documentElement)
                .getPropertyValue('--sg-colors-background')
                .trim(),
        );
        expect(light).toBe('#f7f7f7');
        expect(errors).toEqual([]);
    });

    test('the compact bar keeps three controls and moves the rest to settings', async ({
        page,
    }) => {
        await boot(page);
        await expect(page.locator('#command-bar > #surface-buttons')).toBeVisible();
        await expect(page.locator('#command-bar > #depth-mode')).toBeVisible();
        await expect(page.locator('#command-bar > #focus-primary')).toBeVisible();
        await expect(page.locator('#command-bar > #follow-mode')).toHaveCount(0);
        await page.locator('#settings-menu summary').click();
        await expect(page.locator('#settings-menu #follow-mode')).toBeVisible();
        await expect(page.locator('#settings-menu #catalog-toggle')).toBeVisible();
    });

    test('keyboard opens verbs, knobs and help, and Enter runs a command', async ({ page }) => {
        const errors = await boot(page);
        await page.locator('#canvas').focus();
        await page.keyboard.press('/');
        await expect(page.locator('#command-surface')).toBeVisible();
        expect(await page.evaluate(() => (window as any).__pi.commandMode())).toBe('palette');
        await page.keyboard.press(':');
        expect(await page.evaluate(() => (window as any).__pi.commandMode())).toBe('commands');
        await page.keyboard.press('?');
        expect(await page.evaluate(() => (window as any).__pi.commandMode())).toBe('help');
        await page.keyboard.press('Escape');
        await expect(page.locator('#command-surface')).toBeHidden();

        await page.locator('#command-open').click();
        await page.locator('#command-input').fill('Toggle catalog');
        expect(await page.locator('.command-row').count()).toBe(1);
        await page.keyboard.press('Enter');
        await expect(page.locator('body')).toHaveAttribute('data-catalog', 'open');
        expect(errors).toEqual([]);
    });

    test('the inspector tabs and pin stay inside the existing lens', async ({ page }) => {
        const errors = await boot(page);
        await page.evaluate(() => {
            const pi = (window as any).__pi;
            pi.reveal(pi.edges()[0].target);
        });
        await expect(page.locator('#focus-lens')).toBeVisible();
        await expect(page.locator('#focus-lens .focus-chip').first()).toBeVisible();
        await page.locator('#focus-lens [data-tab-target="inner"]').click();
        expect(await page.evaluate(() => (window as any).__pi.inspectorTab())).toBe('inner');
        await expect(page.locator('#focus-lens .focus-detail')).toBeHidden();
        await page.locator('#inspector-pin').click();
        expect(await page.evaluate(() => (window as any).__pi.inspectorPinned())).toBe(true);
        await expect(page.locator('#focus-lens')).toHaveAttribute('data-pinned', 'true');
        await page.locator('#inspector-pin').click();
        expect(await page.evaluate(() => (window as any).__pi.inspectorPinned())).toBe(false);
        expect(errors).toEqual([]);
    });

    test('the rail never shows more than two contextual instruments', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const pi = (window as any).__pi;
            pi.setLevel('detail');
            pi.reveal(pi.edges()[0].target);
        });
        expect(
            await page.evaluate(() => (window as any).__pi.railInstruments()),
        ).toBeLessThanOrEqual(2);
    });

    test('primary controls keep a 44px hit area', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const pi = (window as any).__pi;
            pi.reveal(pi.edges()[0].target);
        });
        await expect(page.locator('.focus-button').first()).toBeVisible();
        const smallest = await page.evaluate(() =>
            ['#command-open', '#depth-mode', '#rail #vision-loop-toggle', '.focus-button']
                .map((selector) => {
                    const rect = document.querySelector(selector)!.getBoundingClientRect();
                    return Math.min(rect.width, rect.height);
                })
                .reduce((a, b) => Math.min(a, b)),
        );
        expect(smallest).toBeGreaterThanOrEqual(44);
    });

    test('graph shots use a quiet frame and chrome shots restore the rail', async ({ page }) => {
        await page.goto('/?shot=cockpit');
        await page.waitForFunction(() => (window as any).__pi?.ready === true);
        await expect(page.locator('#rail')).toBeHidden();
        const quietWidth = await page.locator('#canvas').boundingBox();

        await page.evaluate(() => (window as any).__pi.applyShot('policy'));
        await expect(page.locator('#rail')).toBeVisible();
        const chromeWidth = await page.locator('#canvas').boundingBox();
        expect(quietWidth!.width).toBeGreaterThan(chromeWidth!.width);
    });

    test('chrome follows direction without losing tab order', async ({ page }) => {
        const errors = await boot(page);
        await page.evaluate(() => {
            document.documentElement.dir = 'rtl';
            const pi = (window as any).__pi;
            pi.reveal(pi.edges()[0].target);
        });
        await expect(page.locator('#focus-lens')).toBeVisible();
        expect(
            await page.evaluate(() => getComputedStyle(document.documentElement).direction),
        ).toBe('rtl');
        expect(
            await page.evaluate(() => {
                (document.querySelector('#settings-menu') as HTMLElement).setAttribute('open', '');
                return getComputedStyle(document.querySelector('#settings-menu > div')!).insetInlineEnd;
            }),
        ).toBe('0px');
        await page.locator('#focus-lens [data-tab-target="detail"]').focus();
        await page.keyboard.press('ArrowLeft');
        expect(await page.evaluate(() => (window as any).__pi.inspectorTab())).toBe('inner');
        expect(errors).toEqual([]);
    });
});
