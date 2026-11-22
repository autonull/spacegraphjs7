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

    test('the command bar stays on one row at narrow widths', async ({ page }) => {
        const errors = await boot(page);
        await page.setViewportSize({ width: 900, height: 1000 });
        await page.waitForTimeout(300);
        const layout = await page.evaluate(() => ({
            header: document.querySelector('#command-bar')!.getBoundingClientRect().height,
            canvasTop: document.querySelector('#canvas')!.getBoundingClientRect().top,
        }));
        expect(layout.header).toBeLessThanOrEqual(48);
        expect(layout.canvasTop).toBeLessThanOrEqual(64);
        for (const selector of [
            '#command-open',
            '#proof-line',
            '#settings-menu summary',
            '#attention',
        ]) {
            await expect(page.locator(selector)).toBeVisible();
        }
        expect(errors).toEqual([]);
    });

    test('the readout stays on the canvas when the transcript moves below it', async ({
        page,
    }) => {
        await boot(page);
        await page.evaluate(() => (window as any).__pi.setArrangement('stacked'));
        const bounds = await page.evaluate(() => {
            const rect = (id: string) => document.getElementById(id)!.getBoundingClientRect();
            return { hud: rect('hud'), canvas: rect('canvas'), transcript: rect('transcript') };
        });
        expect(bounds.hud.top).toBeGreaterThanOrEqual(bounds.canvas.top);
        expect(bounds.hud.bottom).toBeLessThanOrEqual(bounds.canvas.bottom);
        expect(bounds.hud.bottom).toBeLessThanOrEqual(bounds.transcript.top);
    });

    test('adaptive fit refits on a material aspect change only', async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 });
        const errors = await boot(page);
        await page.waitForFunction(() => (window as any).__pi.adaptiveFit()?.refits >= 1);
        const canvasAspect = (): Promise<number> =>
            page.evaluate(() => {
                const canvas = document.getElementById('canvas')!;
                return canvas.clientWidth / canvas.clientHeight;
            });
        const wide = await page.evaluate(() => (window as any).__pi.adaptiveFit());
        expect(wide.aspect).toBeCloseTo(await canvasAspect(), 2);
        expect(wide.insets.top).toBeGreaterThan(0);
        expect(wide.octaves).toEqual([-1, 0, 1]);

        await page.setViewportSize({ width: 1560, height: 1000 });
        await page.waitForTimeout(300);
        const afterSmall = await page.evaluate(() => (window as any).__pi.adaptiveFit().refits);
        expect(afterSmall).toBe(wide.refits);

        await page.setViewportSize({ width: 900, height: 1000 });
        await page.waitForFunction(
            (count) => (window as any).__pi.adaptiveFit().refits > count,
            wide.refits,
        );
        const narrow = await page.evaluate(() => (window as any).__pi.adaptiveFit());
        expect(narrow.aspect).toBeCloseTo(await canvasAspect(), 2);
        expect(narrow.insets.left).toBeLessThan(narrow.insets.top);
        expect(errors).toEqual([]);
    });

    test('readout diagnostics are disclosed on demand, not in the default frame', async ({
        page,
    }) => {
        await boot(page);
        const hud = page.locator('#hud');
        await expect(hud).not.toContainText('fps');
        await expect(hud).toHaveAttribute('title', /energy .* overlap .* fps/);
        await page.locator('#settings-menu summary').click();
        await page.locator('#diagnostics-toggle').click();
        await expect(hud).toContainText('fps');
        await expect(page.locator('#diagnostics-toggle')).toHaveAttribute('aria-pressed', 'true');
        await page.goto('/?debug=1');
        await page.waitForFunction(() => (window as any).__pi?.ready === true);
        await expect(page.locator('#hud')).toContainText('fps');
    });

    test('the rail discloses secondary sections behind reachable group headers', async ({
        page,
    }) => {
        const errors = await boot(page);
        await expect(page.locator('#rail-navigate')).toHaveAttribute('open', '');
        await expect(page.locator('#rail-inspect')).toHaveAttribute('open', '');
        await expect(page.locator('#rail-share')).not.toHaveAttribute('open', '');
        await expect(page.locator('#rail-learn')).not.toHaveAttribute('open', '');
        await expect(page.locator('#annotation-input')).toBeHidden();

        const target = await page.evaluate(() =>
            Math.min(
                ...['#rail-navigate', '#rail-inspect', '#rail-share', '#rail-learn'].map((id) => {
                    const rect = document.querySelector(`${id} > summary`)!.getBoundingClientRect();
                    return Math.min(rect.width, rect.height);
                }),
            ),
        );
        expect(target).toBeGreaterThanOrEqual(44);

        await page.locator('#rail-share > summary').click();
        await expect(page.locator('#annotation-input')).toBeVisible();
        expect(errors).toEqual([]);
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

    test('the palette exposes focused-node actions and reaches the inspector', async ({ page }) => {
        const errors = await boot(page);
        await page.waitForFunction(() => (window as any).__pi.edges().length > 0);
        await page.evaluate(() => {
            const pi = (window as any).__pi;
            pi.reveal(pi.edges()[0].target);
        });
        await expect(page.locator('#focus-lens')).toBeVisible();
        await page.locator('#command-open').click();
        await page.locator('#command-input').fill('focused node');
        expect(await page.locator('.command-row').count()).toBeGreaterThanOrEqual(3);
        await page.keyboard.press('Escape');

        await page.locator('#command-open').click();
        await page.locator('#command-input').fill('Focus the inspector');
        await page.keyboard.press('Enter');
        await expect(page.locator('#focus-lens [role="tab"][aria-selected="true"]')).toBeFocused();
        expect(errors).toEqual([]);
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
