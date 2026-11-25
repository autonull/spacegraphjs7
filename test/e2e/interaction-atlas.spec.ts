import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    BASE,
    OUT,
    apply,
    boot,
    call,
    captureAll,
    configure,
    settle,
    sha256,
    writeManifest,
    type Shot,
} from './atlas-kit.js';

// Interaction atlas. One page, one boot, declarative shots: every control axis and mode is driven
// through the explorer's window API. Shape shots are derived from the declared axis values at boot,
// so a new shape needs no test edit. SG_ATLAS_DIR moves the frames; SG_ATLAS_FULL adds the sweep
// and the WebGL showcase surface.

const SHOTS: Shot[] = [
    { id: '00-explorer-ui', title: 'Control surface: every axis, preset and hash', target: 'page' },
    {
        id: '01-baseline',
        title: 'Baseline demo host, card representation',
        verify: (s) => expect(s.nodes[0]).toBeGreaterThan(8),
    },
    {
        id: '02-contract-source',
        title: 'Alternate host: contract fixture',
        set: { source: 'contract' },
    },
    ...['matrix', 'lanes', 'timeline', 'hierarchy', 'tree', 'force'].map((view) => ({
        id: `view-${view}`,
        title: `View: ${view}`,
        set: { view },
        ...(view === 'timeline'
            ? {
                  note: 'The timeline strategy places only two time-stamped nodes; the sparse frame is expected.',
              }
            : {}),
    })),
    ...['overview', 'detail'].map((level) => ({
        id: `level-${level}`,
        title: `Level: ${level}`,
        set: { level },
    })),
    ...['dot', 'glyph', 'detail'].map((lod) => ({
        id: `lod-${lod}`,
        title: `Representation: ${lod}`,
        set: { lod },
    })),
    {
        id: 'lod-transition-mid',
        title: 'Representation swap, captured mid-tween',
        set: { lod: 'dot' },
        expectConfig: { lod: 'detail' },
        timing: 'transition',
        verify: (s) => expect(s.config.lod).toBe('detail'),
    },
    { id: 'edge-ribbon', title: 'Edge ladder: ribbon', set: { edgeLod: 'ribbon' } },
    {
        id: 'widgets-max',
        title: 'Widget registry on every slot',
        set: { lod: 'widget', widgets: 'max' },
        verify: (s) => expect(s.widgets.length).toBeGreaterThan(0),
    },
    {
        id: 'salience-emphasis',
        title: 'Combined salience mapped to node size',
        set: { salience: 'combined', emphasis: 'size' },
        select: true,
        verify: (s) => expect(Object.values(s.salience).some((v) => v > 0)).toBe(true),
    },
    {
        id: 'depth-orbit',
        title: 'Depth continuum: orbit on the hierarchy axis',
        set: { depth: 'orbit', depthAxis: 'hierarchy' },
        note: 'Depth offsets are z-only, so the flat SVG preview barely changes; depth() holds the evidence.',
        verify: (s) => expect(Object.values(s.depth).some((v) => v !== 0)).toBe(true),
    },
    {
        id: 'scene-all',
        title: 'World policy: all scene features with attached widgets',
        set: { sceneFeature: 'all', lod: 'detail', widgets: 'attached' },
        note: 'Scene features are inert in svg-preview; the world() policy, not the pixels, is the evidence.',
    },
    {
        id: 'camera-orbit',
        title: 'Camera verb: orbit',
        set: { cameraVerb: 'orbit' },
        note: 'The SVG preview has no camera; camera().calls records the verb.',
        verify: (s) => expect(s.camera.calls.join(' ')).toContain('orbit'),
    },
    {
        id: 'motion-arrive',
        title: 'Motion verb: arrive, captured mid-playback',
        set: { motionVerb: 'arrive' },
        timing: 'motion',
        verify: (s) => expect(s.motion.frames).toBeGreaterThan(0),
    },
    {
        id: 'motion-reduced',
        title: 'Reduced motion: LOD swap lands on its final frame',
        set: { motion: 'reduced', lod: 'detail' },
    },
    {
        id: 'theme-dark',
        title: 'Dark chrome (full page)',
        target: 'page',
        note: 'Explorer chrome follows data-theme; the InlineGraph SVG keeps its boot-time theme.',
    },
    {
        id: 'theme-light',
        title: 'Light chrome (full page)',
        theme: 'light',
        target: 'page',
        note: 'Compare with theme-dark: only the page chrome changes, not the SVG theme.',
    },
    {
        id: 'compare',
        title: 'Two hosts side by side with the axis diff',
        compare: true,
        target: 'stage',
        verify: (s) => expect(s.diff.length).toBeGreaterThan(0),
    },
    {
        id: 'preset-max-detail',
        title: 'Preset: max detail',
        preset: 'max-detail',
        verify: (s) => expect(s.config.lod).toBe('detail'),
    },
    {
        id: 'preset-orbit-world',
        title: 'Preset: orbit world',
        preset: 'orbit-world',
        verify: (s) => expect(s.config.depth).toBe('orbit'),
    },
];

const POLYGON_SHAPES = new Set(['diamond', 'hexagon', 'triangle', 'star']);

function shapeShots(values: readonly string[]): Shot[] {
    return values.map((value) => ({
        id: `shape-${value}`,
        title: `Shape: ${value}${value === 'by-kind' ? ' (heterogeneous by node kind)' : ''}`,
        set: { shape: value },
        note:
            value === 'by-kind'
                ? 'One graph, several shapes: stages are pills, tools hexagons, failures stars.'
                : undefined,
    }));
}

async function shapeGeometry(page: Page) {
    return page.evaluate(() => {
        const graph = document.querySelector('#left-graph svg');
        if (!graph) return { polygons: 0, pills: 0, circles: 0, kinds: [] as string[] };
        return {
            polygons: graph.querySelectorAll('polygon').length,
            pills: [...graph.querySelectorAll('[data-visual-shape="pill"]')].length,
            circles: graph.querySelectorAll('circle').length,
            kinds: [
                ...new Set(
                    [...graph.querySelectorAll<SVGElement>('[data-visual-shape]')].map(
                        (node) => node.dataset.visualShape!,
                    ),
                ),
            ],
        };
    });
}

test.describe('interaction atlas (screenshot harness)', () => {
    test('captures every labelled control mode into one manifest', async ({ page }) => {
        test.setTimeout(120_000);
        const errors = await boot(page);
        const shapeValues = await page.$$eval('[data-axis="shape"]', (elements) =>
            elements.map((element) => element.getAttribute('data-value')!),
        );
        expect(shapeValues.length).toBeGreaterThan(5);
        const shots = [...SHOTS, ...shapeShots(shapeValues)];
        const frames = await captureAll(page, shots);

        for (const value of shapeValues) {
            await configure(page, { id: value, title: value, set: { shape: value } });
            const geometry = await shapeGeometry(page);
            if (POLYGON_SHAPES.has(value)) expect(geometry.polygons, value).toBeGreaterThan(0);
            if (value === 'pill') expect(geometry.pills, value).toBeGreaterThan(0);
            if (value === 'dot') expect(geometry.circles, value).toBeGreaterThan(0);
            if (value === 'by-kind')
                expect(
                    geometry.kinds.length,
                    `${value}: ${JSON.stringify(geometry.kinds)}`,
                ).toBeGreaterThan(2);
        }

        const hashOf = (id: string) => frames.find((frame) => frame.id === id)?.sha256;
        for (const [a, b] of [
            ['shape-by-kind', 'shape-auto'],
            ['shape-diamond', 'shape-auto'],
            ['theme-dark', 'theme-light'],
            ['view-tree', '01-baseline'],
            ['lod-dot', 'lod-detail'],
        ])
            expect(hashOf(a), `${a} must differ from ${b}`).not.toBe(hashOf(b));

        expect(errors).toEqual([]);
        writeManifest(resolve(OUT), 'atlas.json', {
            generated: new Date().toISOString(),
            viewport: { width: 1440, height: 900 },
            base: BASE,
            frames,
        });
    });

    test('sweeps every declared axis value (SG_ATLAS_FULL=1)', async ({ page }) => {
        test.skip(process.env.SG_ATLAS_FULL !== '1', 'opt in with SG_ATLAS_FULL=1');
        const errors = await boot(page);
        const axes = await call<string[]>(page, 'axes');
        const values = await page.$$eval('[data-axis]', (elements) =>
            elements.reduce<Record<string, string[]>>((acc, element) => {
                const axis = element.getAttribute('data-axis');
                const value = element.getAttribute('data-value');
                if (axis && value) (acc[axis] ??= []).push(value);
                return acc;
            }, {}),
        );

        const dir = resolve(OUT, 'sweep');
        mkdirSync(dir, { recursive: true });
        await call(page, 'reset');
        await apply(page, BASE);
        await settle(page);
        const baseHash = sha256(await page.locator('#left-graph').screenshot());
        const cells: {
            axis: string;
            value: string;
            file: string;
            sha256: string;
            noOp: boolean;
        }[] = [];

        for (const axis of axes) {
            for (const value of values[axis] ?? []) {
                await call(page, 'reset');
                await apply(page, BASE);
                if (BASE[axis] !== value) await call(page, 'set', axis, value);
                await settle(page);
                expect((await call<Record<string, string>>(page, 'config'))[axis], axis).toBe(
                    value,
                );
                const frame = await page.locator('#left-graph').screenshot();
                const frameHash = sha256(frame);
                writeFileSync(resolve(dir, `${axis}=${value}.png`), frame);
                cells.push({
                    axis,
                    value,
                    file: `${axis}=${value}.png`,
                    sha256: frameHash,
                    noOp: frameHash === baseHash,
                });
            }
        }

        expect(errors).toEqual([]);
        writeManifest(dir, 'sweep.json', { axes, cells });
    });

    test('captures the WebGL shape showcase (SG_ATLAS_FULL=1)', async ({ page }) => {
        test.skip(process.env.SG_ATLAS_FULL !== '1', 'opt in with SG_ATLAS_FULL=1');
        const dir = resolve(OUT, 'showcase');
        mkdirSync(dir, { recursive: true });
        const frames: { id: string; file: string; bytes: number }[] = [];
        for (const demo of ['node-shape', 'node-group', 'system-architecture']) {
            const errors: string[] = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await page.setViewportSize({ width: 1440, height: 900 });
            await page.goto(`/showcase.html?demo=${demo}`);
            await page.waitForFunction(
                () => (window as { __DEMO_READY?: boolean }).__DEMO_READY === true,
                undefined,
                { timeout: 15_000 },
            );
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(600);
            await expect(page.locator('#app canvas').first()).toBeVisible();
            const file = `${demo}.png`;
            const frame = await page.locator('#app').screenshot();
            writeFileSync(resolve(dir, file), frame);
            frames.push({ id: demo, file, bytes: frame.length });
            expect(errors, demo).toEqual([]);
        }
        writeManifest(dir, 'showcase.json', { frames });
    });
});
