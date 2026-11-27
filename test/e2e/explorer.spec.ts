import { expect, test, type Page } from '@playwright/test';
import { boot, noErrors } from './atlas-kit.js';

// P0.3 — the config explorer. Served by `root: demo`, so the page is `/explorer.html`; run
// `pnpm run dev:demo` first. The page owns a window API so the same state can be driven by a test.

const api = <T>(page: Page, call: string, ...args: unknown[]) =>
    page.evaluate(({ call, args }) => (window as any).__explorer[call](...args) as T, {
        call,
        args,
    });

test.describe('configuration explorer (P0.3)', () => {
    test('lists every declared axis and renders the contract fixture', async ({ page }) => {
        const errors = await boot(page, '/explorer.html', { viewport: false });
        const axes = await api<string[]>(page, 'axes');

        expect(axes).toContain('projection');
        expect(axes).toContain('depth');
        expect(axes).toContain('lod');
        expect(axes).toContain('source');
        for (const axis of axes)
            await expect(page.locator(`[data-axis="${axis}"]`).first()).toBeVisible();
        await expect(page.locator('#left-graph svg')).toBeVisible();
        expect((await api<number[]>(page, 'nodes'))[0]).toBe(8);
        noErrors(errors);
    });

    test('switches the live representation with the lod axis', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await page.locator('[data-axis="lod"][data-value="dot"]').click();
        await expect(page.locator('#left-graph svg circle').first()).toBeVisible();
        expect(await page.locator('#left-graph svg circle').count()).toBe(
            await api<number[]>(page, 'nodes').then((counts) => counts[0]),
        );

        await page.locator('[data-axis="lod"][data-value="detail"]').click();
        expect(await page.locator('#left-graph svg circle').count()).toBe(0);
    });

    test('drives heterogeneous node shapes from the shape axis', async ({ page }) => {
        const errors = await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'shape', 'by-kind');
        const shapes = await page.$$eval('#left-graph [data-visual-shape]', (nodes) => [
            ...new Set(nodes.map((node) => (node as HTMLElement).dataset.visualShape!)),
        ]);
        expect(shapes.length).toBeGreaterThan(2);

        await api(page, 'set', 'shape', 'star');
        await expect(page.locator('#left-graph svg polygon').first()).toBeVisible();
        noErrors(errors);
    });

    test('plays a stable-id representation swap and captures a parity frame', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'lod', 'dot');
        const before = await page.$$eval('#left-graph [data-node-id]', (groups) =>
            groups.map((group) => (group as HTMLElement).dataset.nodeId),
        );

        await page.locator('[data-axis="lod"][data-value="detail"]').click();
        await page.waitForFunction(
            () => {
                const transition = (window as any).__explorer.transition();
                return transition.t > 0 && transition.t < 1 && !transition.done;
            },
            undefined,
            { timeout: 3000 },
        );
        const mid = await api<{ ids: string[]; from: string[]; to: string[]; duration: number }>(
            page,
            'transition',
        );
        expect(mid.ids).toEqual(before);
        expect(mid.from.every((rung) => rung === 'dot')).toBe(true);
        expect(mid.to.every((rung) => rung === 'detail')).toBe(true);
        expect(mid.duration).toBeGreaterThan(0);
        await expect(page.locator('#left-graph [data-transition-t]').first()).toBeVisible();
        const frame = await page.locator('#left-graph').screenshot();
        expect(frame.length).toBeGreaterThan(0);

        await page.waitForFunction(() => (window as any).__explorer.transition().done, undefined, {
            timeout: 3000,
        });
        const after = await page.$$eval('#left-graph [data-node-id]', (groups) =>
            groups.map((group) => (group as HTMLElement).dataset.nodeId),
        );
        expect(after).toEqual(before);
        expect((await api<Record<string, string>>(page, 'config')).lod).toBe('detail');
    });

    test('reduced motion collapses the swap to its final frame', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'lod', 'dot');
        await api(page, 'set', 'motion', 'reduced');
        await api(page, 'set', 'lod', 'detail');
        const transition = await api<{ t: number; done: boolean; duration: number }>(
            page,
            'transition',
        );
        expect(transition).toMatchObject({ t: 1, done: true });
        expect(transition.duration).toBeGreaterThan(0);
        const values = await page.$$eval('#left-graph [data-transition-t]', (groups) =>
            groups.map((group) => (group as HTMLElement).dataset.transitionT),
        );
        expect(values.every((value) => value === '1.000')).toBe(true);
    });

    test('switches the edge rung through the edgeLod axis', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await page.locator('[data-axis="edgeLod"][data-value="arrow"]').click();
        const arrows = await page.locator('#left-graph svg line[stroke-dasharray]').count();

        await page.locator('[data-axis="edgeLod"][data-value="bundle"]').click();
        const bundles = await page.locator('#left-graph svg line[stroke-dasharray]').count();
        expect(bundles).toBeGreaterThan(arrows);
    });

    test('drives the demo host over the same model', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        const contractNodes = (await api<number[]>(page, 'nodes'))[0];
        await api(page, 'set', 'source', 'demo');

        await expect(page.locator('#left-title')).toContainText('demo');
        const hostNodes = (await api<number[]>(page, 'nodes'))[0];
        expect(hostNodes).toBeGreaterThan(0);
        expect(hostNodes).not.toBe(contractNodes);
    });

    test('round-trips the full state through the URL hash', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'lod', 'glyph');
        await api(page, 'set', 'depth', 'orbit');
        const hash = await api<string>(page, 'hash');

        await page.goto(`/explorer.html${hash}`);
        await page.waitForFunction(() => (window as any).__ready === true);
        expect(await api<string>(page, 'hash')).toBe(hash);
        expect((await api<Record<string, string>>(page, 'config')).lod).toBe('glyph');
    });

    test('compares two states and labels presets as examples', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await expect(
            page.locator('fieldset').filter({ has: page.locator('#presets') }),
        ).toContainText('Examples, not defaults');
        await page.locator('#compare').click();

        await expect(page.locator('#right-pane')).toBeVisible();
        expect(await page.locator('#right-graph svg').count()).toBe(1);
        expect(await page.locator('#diff').textContent()).toContain('→');

        await page.locator('[data-preset="zero-motion"]').click();
        expect((await api<Record<string, string>>(page, 'config')).motion).toBe('reduced');
    });

    test('randomize and reset stay within the declared values', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'randomize');
        const randomized = await api<Record<string, string>>(page, 'config');
        expect(Object.keys(randomized).length).toBeGreaterThan(5);
        await api(page, 'reset');
        expect((await api<Record<string, string>>(page, 'config')).lod).toBe('card');
    });
});

test.describe('salience and emphasis (P2)', () => {
    test('the salience panel has one clear empty state', async ({ page }) => {
        const errors = await boot(page, '/explorer.html', { viewport: false });
        await expect(page.locator('#explain')).toHaveText('No node selected.');
        const hint = await page.locator('fieldset:has(#explain) .meta').textContent();
        expect(hint).toContain('Select a node');
        expect(hint).not.toContain('Click a node');
        noErrors(errors);
    });

    test('composes weighted signals and explains a selected node', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'salience', 'combined');
        const values = await api<Record<string, number>>(page, 'salience');
        expect(Object.values(values).some((value) => value > 0)).toBe(true);
        const id = (
            await page.$$eval('#left-graph [data-node-id]', (groups) =>
                groups.map((group) => (group as HTMLElement).dataset.nodeId),
            )
        )[0]!;

        await api(page, 'select', id);
        await expect(page.locator('#explain')).toContainText('salience');
        const reasons = await api<{ label: string; contribution: number }[]>(page, 'explain', id);
        expect(reasons.length).toBeGreaterThan(0);
        expect(reasons.map((reason) => reason.contribution)).toEqual(
            [...reasons.map((reason) => reason.contribution)].sort((a, b) => b - a),
        );
    });

    test('two hosts produce different deterministic salience maps', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'salience', 'combined');
        const contract = await api<Record<string, number>>(page, 'salience');
        expect(await api<Record<string, number>>(page, 'salience')).toEqual(contract);

        await api(page, 'set', 'source', 'demo');
        const second = await api<Record<string, number>>(page, 'salience');
        expect(Object.values(second)).not.toEqual(Object.values(contract));
        expect(await api<Record<string, number>>(page, 'salience')).toEqual(second);
    });

    test('zero signals stay uniform and unsupported channels do not map', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'salience', 'none');
        const uniform = await api<Record<string, number>>(page, 'salience');
        expect(Object.values(uniform).every((value) => value === 0)).toBe(true);
        const id = (
            await page.$$eval('#left-graph [data-node-id]', (groups) =>
                groups.map((group) => (group as HTMLElement).dataset.nodeId),
            )
        )[0]!;
        await api(page, 'select', id);
        expect(await api(page, 'explain', id)).toEqual([]);

        expect(await api<string[]>(page, 'emphasisSupport')).not.toContain('glow');
        await api(page, 'set', 'salience', 'combined');
        await api(page, 'set', 'emphasis', 'none');
        const width = () =>
            page.locator('#left-graph [data-node-id] rect').first().getAttribute('width');
        const plain = await width();
        await api(page, 'set', 'emphasis', 'glow');
        expect(await width()).toBe(plain);
    });

    test('the size channel changes a node width from the salience score', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'salience', 'none');
        const width = () =>
            page.locator('#left-graph [data-node-id] rect').first().getAttribute('width');
        const before = Number(await width());
        await api(page, 'set', 'salience', 'combined');
        await api(page, 'set', 'emphasis', 'size');
        expect(Number(await width())).toBeGreaterThan(before);
    });
});

test.describe('widget registry (P3)', () => {
    test('lists host registrations and attaches on an enabled, preferred slot', async ({
        page,
    }) => {
        const errors = await boot(page, '/explorer.html', { viewport: false });
        await expect(page.locator('#widgets')).toContainText('summary');
        await expect(page.locator('#widgets')).toContainText('composer');

        await api(page, 'set', 'lod', 'widget');
        await api(page, 'set', 'widgets', 'none');
        expect(await api<string[]>(page, 'widgets')).toEqual([]);

        await api(page, 'set', 'widgets', 'body');
        expect(
            (await api<string[]>(page, 'widgets')).some((entry) => entry.endsWith(':summary')),
        ).toBe(true);

        await api(page, 'set', 'widgets', 'attached');
        const mounted = await api<string[]>(page, 'widgets');
        expect(mounted.length).toBeGreaterThan(0);
        expect(mounted.every((entry) => entry.endsWith(':composer'))).toBe(true);
        noErrors(errors);
    });

    test('max widgets attaches a different registration per slot and representation', async ({
        page,
    }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'lod', 'detail');
        await api(page, 'set', 'widgets', 'max');
        const mounted = await api<string[]>(page, 'widgets');
        expect(mounted.some((entry) => entry.endsWith(':composer'))).toBe(true);
        expect(mounted.some((entry) => entry.endsWith(':terminal'))).toBe(true);
    });

    test('projects scene fog onto attached widget opacity', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'lod', 'widget');
        await api(page, 'set', 'widgets', 'attached');
        await api(page, 'set', 'depth', 'flat');
        expect(await api<number>(page, 'widgetOpacity')).toBe(1);

        await api(page, 'set', 'depth', 'layered');
        expect(await api<number>(page, 'widgetOpacity')).toBeLessThan(1);
    });
});

test.describe('motion, depth and world (P4)', () => {
    test('declares every P4 axis and composes an optional scene policy', async ({ page }) => {
        const errors = await boot(page, '/explorer.html', { viewport: false });
        const axes = await api<string[]>(page, 'axes');
        for (const axis of ['motionVerb', 'cameraVerb', 'depthAxis', 'sceneFeature', 'sensory'])
            expect(axes).toContain(axis);

        await api(page, 'set', 'sceneFeature', 'all');
        await api(page, 'set', 'sensory', 'sound');
        await api(page, 'set', 'lod', 'dot');
        const world = await api<{ features: string[]; representation: string; sensory: string }>(
            page,
            'world',
        );
        expect(world.features).toContain('instancing');
        expect(world.representation).toBe('instanced');
        expect(world.sensory).toBe('sound');
        expect(await api<boolean>(page, 'sensorySupport')).toBe(false);
        noErrors(errors);
    });

    test('sequences a host camera verb and samples a host depth axis', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'cameraVerb', 'orbit');
        const camera = await api<{ command?: { verb: string }; calls: string[] }>(page, 'camera');
        expect(camera.command?.verb).toBe('orbit');
        expect(camera.calls.at(-1)).toContain('orbit');

        await api(page, 'set', 'depthAxis', 'lane');
        const offsets = await api<Record<string, number>>(page, 'depth');
        expect(Object.values(offsets).some((offset) => offset !== 0)).toBe(true);
    });

    test('plays a named motion verb with stable-id frames', async ({ page }) => {
        await boot(page, '/explorer.html', { viewport: false });
        await api(page, 'set', 'motionVerb', 'arrive');
        const motion = await api<{ frames: number; active: string[]; done: boolean }>(
            page,
            'motion',
        );
        expect(motion.frames).toBeGreaterThan(0);
    });
});

test.describe('experimentation (P5)', () => {
    test('samples a deterministic matrix and exports the full configuration', async ({ page }) => {
        const errors = await boot(page, '/explorer.html', { viewport: false });
        const matrix = await api<{
            axes: string[];
            sampled: number;
            strategy: string;
            seed: number;
            cells: { values: Record<string, string> }[];
        }>(page, 'matrix');
        expect(matrix.axes).toContain('widgets');
        expect(matrix.axes).toContain('depth');
        expect(matrix.strategy).toBe('sampled');
        expect(matrix.seed).toBe(41);
        expect(matrix.sampled).toBeGreaterThan(0);
        expect(matrix.cells.some((cell) => cell.values.widgets && cell.values.depth)).toBe(true);

        await api(page, 'set', 'widgets', 'max');
        const exported = JSON.parse(await api<string>(page, 'exportConfig'));
        expect(exported.state.widgets).toBe('max');
        expect(exported.hash).toContain('widgets=max');
        expect(exported.matrix.sampled).toBe(matrix.sampled);
        noErrors(errors);
    });
});
