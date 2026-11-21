import { expect, test, type Page } from '@playwright/test';

// The local kernel-op feed replaces the provider: no test reaches a model. The page loads from
// app/pi's own Vite, which proxies /events and /prompt to the Node op server.
const boot = async (page: Page): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('favicon'))
            errors.push(message.text());
    });
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#status')).not.toHaveText('connecting…');
    return errors;
};

const noErrors = (errors: string[]) => expect(errors).toEqual([]);

test.describe('the Pi reference app', () => {
    test('mounts the renderer and lists every capability', async ({ page }) => {
        const errors = await boot(page);

        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
        const ids = await page.evaluate(() => (window as any).__pi.capabilities());
        await expect(page.locator('#gallery button')).toHaveCount(ids.length);
        expect(ids).toContain('failures');
        expect(await page.evaluate(() => (window as any).__pi.ops())).toBeGreaterThan(0);
        await expect(page.locator('#status')).toContainText('nodes');

        noErrors(errors);
    });

    test('runs every capability through the gallery and the test hook', async ({ page }) => {
        const errors = await boot(page);
        await page.evaluate(() => (window as any).__pi.toggleCatalog(true));

        for (const id of await page.evaluate(() => (window as any).__pi.capabilities())) {
            await page.locator(`[data-capability="${id}"]`).click();
            const evidence = await page.evaluate(() => (window as any).__pi.evidence());
            expect(evidence.length, id).toBeGreaterThan(0);
            expect(
                evidence.every((line: string) => line.trim().length > 0),
                id,
            ).toBe(true);
            await expect(page.locator('#evidence li').first()).toBeVisible();
        }

        noErrors(errors);
    });

    test('publishes presets and experiments as launchable catalog links', async ({ page }) => {
        const errors = await boot(page);
        const presets = await page.evaluate(() => (window as any).__pi.policy().presets.length);
        await expect(page.locator('#catalog a[data-preset]')).toHaveCount(presets);
        expect(await page.locator('#catalog a[data-cell]').count()).toBeGreaterThan(0);
        await expect(page.locator('#catalog a[data-preset="quiet"]')).toHaveAttribute(
            'href',
            '?preset=quiet',
        );
        await expect(page.locator('#catalog a[data-preset="quiet"]')).toHaveAttribute(
            'title',
            expect.stringContaining('five tasks'),
        );
        noErrors(errors);
    });

    test('collapses and resizes the transcript from its HUD controls', async ({ page }) => {
        const errors = await boot(page);
        await expect(page.locator('#transcript-list')).toBeVisible();
        await page.locator('#transcript-toggle').click();
        await expect(page.locator('#transcript-list')).toBeHidden();
        expect(await page.evaluate(() => (window as any).__pi.transcriptCollapsed())).toBe(true);
        await page.locator('#transcript-toggle').click();
        await expect(page.locator('#transcript-list')).toBeVisible();

        const before = await page.locator('#transcript').boundingBox();
        const handle = await page.locator('#transcript-resize').boundingBox();
        expect(before).not.toBeNull();
        expect(handle).not.toBeNull();
        await page.mouse.move(handle!.x + 3, handle!.y + 120);
        await page.mouse.down();
        await page.mouse.move(handle!.x - 100, handle!.y + 120, { steps: 6 });
        await page.mouse.up();
        const after = await page.locator('#transcript').boundingBox();
        expect(after!.width).toBeGreaterThan(before!.width + 60);
        expect(await page.evaluate(() => (window as any).__pi.transcriptSize())).toBeGreaterThan(
            320,
        );
        noErrors(errors);
    });

    test('renders the transcript as a spine with expandable detail and a scroll overview', async ({
        page,
    }) => {
        const errors = await boot(page);
        const rows = page.locator('#transcript-list .spine-row');
        expect(await rows.count()).toBeGreaterThan(0);
        await expect(rows.first().locator('.transcript-detail')).toBeHidden();
        await rows.first().locator('.spine-expand').click();
        await expect(rows.first().locator('.transcript-detail')).toBeVisible();

        const dots = page.locator('#transcript-overview circle[data-transcript-node]');
        expect(await dots.count()).toBe(await rows.count());
        await expect(page.locator('#transcript-overview [data-transcript-view]')).toBeVisible();

        const pane = page.locator('#transcript');
        await pane.evaluate((element) => {
            (element as HTMLElement).style.height = '100px';
        });
        const box = await page.locator('#transcript-overview').boundingBox();
        await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height - 4);
        await page.mouse.down();
        await page.mouse.move(box!.x + box!.width / 2, box!.y + 4, { steps: 4 });
        await page.mouse.up();
        expect(
            await pane.evaluate((element) => (element as HTMLElement).scrollTop),
        ).toBeGreaterThan(0);
        noErrors(errors);
    });

    test('keeps card labels at the configured on-screen minimum', async ({ page }) => {
        const errors = await boot(page);
        const measure = () =>
            page.evaluate(() => {
                const span = document.querySelector<HTMLElement>('#canvas [data-rung] > span')!;
                const font = Number.parseFloat(getComputedStyle(span).fontSize);
                const extent = (window as any).__pi.viewport().extent.width;
                const canvas = document.querySelector<HTMLElement>('#canvas')!.clientWidth;
                return {
                    screenPx: (font * canvas) / Math.max(extent, 1),
                    minPx: Number((window as any).__pi.policy().values['ladder.minLabelPx']),
                };
            });
        const initial = await measure();
        expect(initial.screenPx).toBeGreaterThanOrEqual(initial.minPx - 0.5);
        await page.evaluate(() => (window as any).__pi.setKnob('ladder.minLabelPx', 28));
        const raised = await measure();
        expect(raised.minPx).toBe(28);
        expect(raised.screenPx).toBeGreaterThanOrEqual(28 - 0.5);
        noErrors(errors);
    });

    test('follows the newest node and reports attention from the local stream', async ({
        page,
    }) => {
        const errors = await boot(page);

        await page.locator('#settings-menu summary').click();
        await page.locator('#follow-mode').selectOption('node');
        expect(await page.evaluate(() => (window as any).__pi.follow())).toBe('node');
        expect(await page.evaluate(() => (window as any).__pi.setFollow('off'))).toBe('off');
        await expect(page.locator('#follow-mode')).toHaveValue('off');

        await page.evaluate(() => (window as any).__pi.setFollow('node+focus'));
        await expect(page.locator('#follow-state')).toHaveText('node+focus');

        // The local feed replays the same ops, so no new node arrives and the camera stays put.
        await page.locator('#prompt-input').fill('Follow the local feed');
        const accepted = page.waitForResponse(
            (response) =>
                response.url().includes('/prompt') && response.request().method() === 'POST',
        );
        await page.locator('#prompt-form button[type="submit"]').click();
        expect((await accepted).status()).toBe(202);
        expect(await page.evaluate(() => (window as any).__pi.followFrame())).toBeNull();

        const attention = await page.evaluate(() => (window as any).__pi.attention());
        expect(attention.failures).toBeGreaterThanOrEqual(0);
        await expect(page.locator('#attention')).toContainText('file(s)');

        noErrors(errors);
    });

    test('boots a recursive freeform graph in 3D with a settled simulation', async ({ page }) => {
        const errors = await boot(page);

        expect(await page.evaluate(() => (window as any).__pi.depth())).toBe('flat');
        await expect
            .poll(() => page.evaluate(() => (window as any).__pi.scopes().length), {
                timeout: 10_000,
            })
            .toBeGreaterThan(1);
        await expect
            .poll(() => page.evaluate(() => (window as any).__pi.simulation().settled), {
                timeout: 10_000,
            })
            .toBe(true);
        const simulation = await page.evaluate(() => (window as any).__pi.simulation());
        expect(simulation.energy).toBeLessThan(0.001);
        expect(typeof simulation.steps).toBe('number');
        expect(await page.evaluate(() => (window as any).__pi.motion().verbs)).toEqual(
            expect.arrayContaining(['flyTo', 'trace']),
        );
        expect(errors).toEqual([]);
    });

    test('gates depth modes through renderer capabilities', async ({ page }) => {
        const errors = await boot(page);

        for (const mode of ['flat', 'layered', 'depth-stack', 'orbit']) {
            expect(await page.evaluate((value) => (window as any).__pi.setDepth(value), mode)).toBe(
                mode,
            );
            await expect(page.locator('#depth-mode')).toHaveValue(mode);
        }
        expect(await page.evaluate(() => (window as any).__pi.setDepth('unsupported'))).toBe(
            'orbit',
        );
        expect(errors).toEqual([]);
    });

    test('keeps the transcript mounted across hybrid arrangements and permalinks', async ({
        page,
    }) => {
        const errors = await boot(page);

        const rows = page.locator('#transcript-list .transcript-row');
        expect(await rows.count()).toBeGreaterThan(0);
        const transcript = page.locator('#transcript');
        await expect(transcript).toBeVisible();

        await page.evaluate(() => (window as any).__pi.setArrangement('stacked'));
        await expect(page.locator('#surface')).toHaveAttribute('data-arrangement', 'stacked');
        await expect(transcript).toBeVisible();
        await page.evaluate(() => (window as any).__pi.setArrangement('floating'));
        await expect(transcript).toBeVisible();

        await page.evaluate(() => (window as any).__pi.setSurface('map'));
        await expect(transcript).toBeHidden();
        await expect(page.locator('#canvas canvas').first()).toBeVisible();
        await page.evaluate(() => (window as any).__pi.setSurface('hybrid'));
        await expect(transcript).toBeVisible();

        const id = await rows.first().getAttribute('data-node');
        await rows.first().click();
        expect(await page.evaluate(() => (window as any).__pi.revealed())).toBe(id);
        expect(page.url()).toContain(`#graph:${id}`);
        await expect(rows.first()).toHaveAttribute('data-revealed', 'true');
        expect(errors).toEqual([]);
    });

    test('exposes the five questions and new surfaces in the gallery', async ({ page }) => {
        const errors = await boot(page);
        const ids = await page.evaluate(() => (window as any).__pi.capabilities());
        for (const id of [
            'freeform-layout',
            'scopes',
            'levels',
            'depth',
            'motion',
            'five-questions',
        ]) {
            expect(ids, id).toContain(id);
        }
        for (const id of ids.filter((entry: string) => entry.startsWith('question-'))) {
            const evidence = await page.evaluate((value) => (window as any).__pi.run(value), id);
            expect(evidence.length, id).toBeGreaterThan(0);
        }
        expect(errors).toEqual([]);
    });

    test('drives zoom-driven levels, budgets and an opt-in lane scope', async ({ page }) => {
        const errors = await boot(page);

        expect(await page.evaluate(() => (window as any).__pi.levelMode())).toBe('auto');
        expect(await page.evaluate(() => (window as any).__pi.budgets())).toEqual({
            overview: 12,
            execution: 40,
            detail: 24,
        });
        await page.evaluate(() => (window as any).__pi.setLevelMode('detail'));
        expect(await page.evaluate(() => (window as any).__pi.level())).toBe('detail');
        await expect(page.locator('#level-mode')).toHaveValue('detail');
        await page.evaluate(() => (window as any).__pi.setLevelMode('auto'));

        const before = await page.evaluate(() =>
            (window as any).__pi.scopeSpecs().map((s: any) => s.strategy),
        );
        expect(before).toContain('force');
        const id = await page.evaluate(() =>
            (window as any).__pi.scopes().find((s: string) => s.startsWith('unit-')),
        );
        await page.evaluate((value) => (window as any).__pi.setLaneScope(value), id);
        const after = await page.evaluate(() => (window as any).__pi.scopeSpecs());
        expect(after.find((spec: any) => spec.id === id).strategy).toBe('grid');
        expect(errors).toEqual([]);
    });

    test('windows the render, exports artifacts and mirrors gestures on the keyboard', async ({
        page,
    }) => {
        const errors = await boot(page);

        await page.evaluate(() => (window as any).__pi.loadFixture());
        await page.evaluate(() => (window as any).__pi.setWindowSize(1));
        expect(await page.evaluate(() => (window as any).__pi.windowSize())).toBe(1);
        expect(await page.evaluate(() => (window as any).__pi.hidden())).toBeGreaterThan(0);
        await expect(page.locator('#history-banner')).toBeVisible();

        for (const [format, marker] of [
            ['json', 'nodes'],
            ['svg', '<svg'],
            ['html', '<li'],
        ] as const) {
            const output = await page.evaluate(
                (value) => (window as any).__pi.export(value),
                format,
            );
            expect(output, format).toContain(marker);
        }

        const viewport = () =>
            page.evaluate(() => {
                const [instance] = Array.from((window as any).SpaceGraph.instances);
                return (instance as any).cameraControls.target.x;
            });
        await page.locator('#canvas').focus();
        const beforePan = await viewport();
        await page.keyboard.press('ArrowLeft');
        expect(await viewport()).not.toBe(beforePan);
        expect(
            await page.evaluate(() => (window as any).__pi.unsupported().map((s: any) => s.id)),
        ).toEqual(['webxr', 'sound', 'haptics']);
        expect(errors).toEqual([]);
    });

    test('navigates revealed nodes through the trail, portal path and minimap', async ({
        page,
    }) => {
        const errors = await boot(page);

        const rows = page.locator('#transcript-list .transcript-row');
        const first = (await rows.nth(0).getAttribute('data-node'))!;
        const second = (await rows.nth(1).getAttribute('data-node'))!;
        await rows.nth(0).click();
        await rows.nth(1).click();
        const trail = await page.evaluate(() => (window as any).__pi.trail());
        expect(trail.entries.at(-2)).toBe(first);
        expect(trail.current).toBe(second);
        await expect(page.locator('#trail-list button[data-trail-node]')).toHaveCount(
            trail.entries.length,
        );
        await expect(page.locator('#trail-back')).toBeEnabled();
        await expect(page.locator('#trail-forward')).toBeDisabled();

        await page.locator('#trail-back').click();
        expect(await page.evaluate(() => (window as any).__pi.revealed())).toBe(first);
        await page.locator('#trail-forward').click();
        expect(await page.evaluate(() => (window as any).__pi.revealed())).toBe(second);

        const minimap = await page.evaluate(() => (window as any).__pi.minimap());
        expect(minimap.dots).toBeGreaterThan(0);
        expect(typeof minimap.viewRect).toBe('boolean');
        await expect(page.locator('#minimap svg circle').first()).toBeVisible();

        const portalId = await page.evaluate(() => {
            const pi = (window as any).__pi;
            return pi.portalNodes().find((id: string) => {
                pi.reveal(id);
                return pi.portalChain().length > 1;
            });
        });
        expect(portalId).toBeTruthy();
        const chain = await page.evaluate(() => (window as any).__pi.portalChain());
        expect(chain[0]).toBe('run');
        await expect(page.locator('#portal-crumb button')).toHaveCount(chain.length);
        await page.locator('#portal-crumb button').first().click();
        expect(await page.evaluate(() => (window as any).__pi.revealed())).not.toBe(portalId);

        noErrors(errors);
    });

    test('submits the prompt form against the local op server', async ({ page }) => {
        const errors = await boot(page);
        const before = await page.evaluate(() => (window as any).__pi.ops());

        await page.locator('#prompt-input').fill('Summarise the repo');
        await page.locator('#prompt-mode').selectOption('steer');
        const accepted = page.waitForResponse(
            (response) =>
                response.url().includes('/prompt') && response.request().method() === 'POST',
        );
        await page.locator('#prompt-form button[type="submit"]').click();
        expect((await accepted).status()).toBe(202);

        await expect(page.locator('#prompt-input')).toHaveValue('');
        expect(await page.evaluate(() => (window as any).__pi.ops())).toBeGreaterThanOrEqual(
            before,
        );

        noErrors(errors);
    });
});
