import { expect, test, type Page } from '@playwright/test';
import { createVisionAssert } from '../../../src/vision/assert';
import { encodePolicyVector, POLICY_SCHEMA } from '../src/policy';
import { FIT_OCTAVES } from '../src/policy/adaptive-fit';
import { SHOTS } from '../src/shots';

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
    const record = await vision.record();
    expect(['heuristics', 'onnx']).toContain(record.strategy);
    expect(record.agreement.agrees, record.agreement.note).toBe(true);
    await vision.noOverlap();
    await vision.isLegible();
    await vision.expectedLayoutScore(35);
};

test.describe('Pi flagship vision atlas', () => {
    test('adaptive fit stays legible across three octaves and two aspects', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        for (const octave of FIT_OCTAVES) {
            for (const aspect of ['wide', 'narrow'] as const) {
                const shot = SHOTS.find(
                    (entry) => entry.id === `fit-${aspect}-${octave < 0 ? 'far' : octave > 0 ? 'near' : 'mid'}`,
                )!;
                await page.setViewportSize(shot.viewport!);
                await page.goto(`/?shot=${shot.id}`);
                await page.waitForFunction(() => (window as any).__pi?.ready === true);
                await page.waitForFunction(() => (window as any).__pi?.shotReady?.() === true);
                await page.evaluate(() => (window as any).__pi.pause(true));
                await page.evaluate(() => (window as any).__pi.settle());
                await assertScene(page);
            }
        }
        expect(errors).toEqual([]);
    });

    test('bounded recursion keeps intermediate frames legible on re-entry', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.setViewportSize({ width: 1600, height: 1000 });
        await page.goto('/?shot=recursion');
        await page.waitForFunction(() => (window as any).__pi?.ready === true);
        await page.waitForFunction(() => (window as any).__pi?.shotReady?.() === true);
        const chips = page.locator('#focus-lens .focus-chip');
        const count = await chips.count();
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(6);
        expect(await page.locator('#focus-lens .focus-connectors g').count()).toBe(count);
        expect(await page.locator('#focus-lens .focus-port').count()).toBe(count * 2);

        await page.evaluate(() => (window as any).__pi.pause(true));
        const before = await page.evaluate(() => (window as any).__pi.revealed());
        await page.locator('#focus-lens .focus-chip [data-node-action="focus"]').first().click();
        await expect
            .poll(() => page.evaluate(() => (window as any).__pi.revealed()))
            .not.toBe(before);
        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => (window as any).__pi.advance(0.05));
            await assertScene(page);
        }
        await page.evaluate(() => (window as any).__pi.settle());
        await assertScene(page);
        expect(errors).toEqual([]);
    });

    test('opt-in dense typography stays legible across the fit matrix', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        for (const octave of FIT_OCTAVES) {
            for (const aspect of ['wide', 'narrow'] as const) {
                const label = octave < 0 ? 'far' : octave > 0 ? 'near' : 'mid';
                const shot = SHOTS.find((entry) => entry.id === `fit-${aspect}-${label}`)!;
                await page.setViewportSize(shot.viewport!);
                await page.goto(`/?shot=${shot.id}&preset=dense-type`);
                await page.waitForFunction(() => (window as any).__pi?.ready === true);
                await page.waitForFunction(() => (window as any).__pi?.shotReady?.() === true);
                expect(
                    await page.evaluate(() => document.documentElement.dataset.density),
                ).toBe('dense');
                await page.evaluate(() => (window as any).__pi.pause(true));
                await page.evaluate(() => (window as any).__pi.settle());
                await assertScene(page);
            }
        }
        expect(errors).toEqual([]);
    });

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

    test('play borrows a preset, then reconcile returns to the authority', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => (window as any).__pi.play('zero-g'));
        expect(await page.evaluate(() => (window as any).__pi.playSession().active)).toBe(true);
        await page.evaluate(() => (window as any).__pi.reconcilePlay());
        expect(await page.evaluate(() => (window as any).__pi.playSession().active)).toBe(false);
        await expect
            .poll(() => page.evaluate(() => (window as any).__pi.simulation().settled), { timeout: 10_000 })
            .toBe(true);
        await assertScene(page);
    });

    test('trace highlights an ordered path and sweeps the camera', async ({ page }) => {
        await boot(page);
        const id = await page.locator('[data-node]').first().getAttribute('data-node');
        expect(id).toBeTruthy();
        const before = await page.evaluate(() => (window as any).__pi.viewport().center);
        const path = await page.evaluate((nodeId) => (window as any).__pi.trace(nodeId), id);
        expect(path.length).toBeGreaterThan(0);
        expect(path[0]).toBe(id);
        for (let i = 0; i < 40; i++) {
            await page.evaluate(() => (window as any).__pi.advance(0.05));
        }
        const after = await page.evaluate(() => (window as any).__pi.viewport().center);
        expect(after).not.toEqual(before);
        await assertScene(page);
    });

    test('intermediate frames of an edge traverse stay legible', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => (window as any).__pi.pause(true));
        const edge = await page.evaluate(() => (window as any).__pi.edges()[0]);
        expect(edge).toBeTruthy();
        await page.evaluate((id) => (window as any).__pi.traverseEdge(id), edge.id);
        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => (window as any).__pi.advance(0.05));
            await assertScene(page);
        }
        await page.evaluate(() => (window as any).__pi.settle());
        await assertScene(page);
    });

    // Fast slice gate: one representative shot in both themes. The full four-shot matrix runs only
    // at slice boundaries via `shots:all` plus the unit ContrastAuditor palette audit.
    test('the representative gate shot stays legible in both themes', async ({ page }) => {
        const light = encodePolicyVector(POLICY_SCHEMA, { 'theme.variant': 'light' });
        for (const variant of ['dark', 'light']) {
            const policy = variant === 'light' ? `&policy=${encodeURIComponent(light)}` : '';
            await page.goto(`/?shot=cockpit${policy}`);
            await page.waitForFunction(() => (window as any).__pi?.ready === true);
            await expect
                .poll(() => page.evaluate(() => (window as any).__pi.simulation().settled), {
                    timeout: 10_000,
                })
                .toBe(true);
            await assertScene(page);
        }
    });

    test('intermediate frames of a scope descent stay legible', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => (window as any).__pi.pause(true));
        const target = await page.evaluate(() => (window as any).__pi.descend());
        expect(target).toBeTruthy();
        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => (window as any).__pi.advance(0.05));
            await assertScene(page);
        }
        await page.evaluate(() => (window as any).__pi.settle());
        await assertScene(page);
    });

    test('inspector pin and unpin keep the settled scene legible', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const pi = (window as any).__pi;
            pi.reveal(pi.edges()[0].target);
            pi.settle();
        });
        await assertScene(page);
        await page.evaluate(() => (window as any).__pi.setInspectorPinned(true));
        await assertScene(page);
        await page.evaluate(() => (window as any).__pi.setInspectorPinned(false));
        await assertScene(page);
    });

    test('every representation rung stays legible', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            (window as any).__pi.pause(true);
            (window as any).__pi.settle();
        });
        for (const level of ['overview', 'execution', 'detail']) {
            await page.evaluate((value) => {
                (window as any).__pi.setLevel(value);
                (window as any).__pi.paint();
            }, level);
            const rungs = await page
                .locator('[data-rung]')
                .evaluateAll((nodes) => [...new Set(nodes.map((node) => (node as HTMLElement).dataset.rung))]);
            expect(rungs).toContain(level);
            await assertScene(page);
        }
    });

    test('guided replay walks five questions across three surfaces', async ({ page }) => {
        await boot(page);
        expect((await page.evaluate(() => (window as any).__pi.walkthrough())).length).toBe(15);
        const evidence = await page.evaluate(() => (window as any).__pi.replay());
        expect(evidence.length).toBeGreaterThanOrEqual(5);
        await assertScene(page);
    });

    test('a full-state permalink round-trips through the URL', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            const api = (window as any).__pi;
            api.setSurface('map');
            api.setArrangement('stacked');
            api.setLevelMode('detail');
        });
        const link = await page.evaluate(() => (window as any).__pi.permalink());
        await page.goto(link);
        await page.waitForFunction(() => (window as any).__pi?.ready === true);
        expect(await page.evaluate(() => (window as any).__pi.surface())).toBe('map');
        expect(await page.evaluate(() => (window as any).__pi.arrangement())).toBe('stacked');
        expect(await page.evaluate(() => (window as any).__pi.levelMode())).toBe('detail');
        await assertScene(page);
    });

    test('the runtime vision loop stays inert until the host opts in', async ({ page }) => {
        await boot(page);
        const before = await page.evaluate(() => (window as any).__pi.visionLoop());
        expect(before.enabled).toBe(false);
        expect(before.report).toBeUndefined();

        await page.locator('#vision-loop-toggle').click();
        await expect
            .poll(() => page.evaluate(() => (window as any).__pi.visionLoop().report !== undefined), {
                timeout: 10_000,
            })
            .toBe(true);
        const loop = await page.evaluate(() => (window as any).__pi.visionLoop());
        expect(loop.enabled).toBe(true);
        expect(loop.unsupported).toEqual([]);
        expect(loop.report.retargeted).toBeDefined();

        const hud = await page.locator('#vision-loop-state').textContent();
        for (const key of ['overlap', 'legibility', 'hierarchy', 'ergonomics', 'retargeted']) {
            expect(hud).toContain(key);
        }
        await assertScene(page);
    });

    test('the opt-in URL boots a loop whose report agrees with the gate', async ({ page }) => {
        await page.goto('/?visionLoop=on');
        await page.waitForFunction(() => (window as any).__pi?.ready === true);
        await expect
            .poll(() => page.evaluate(() => (window as any).__pi.visionLoop().report !== undefined), {
                timeout: 10_000,
            })
            .toBe(true);
        const record = await createVisionAssert(page).record();
        expect(record.loop).toBeDefined();
        expect(record.agreement.agrees, record.agreement.note).toBe(true);
        await assertScene(page);
    });
});
