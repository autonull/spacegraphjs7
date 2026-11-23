import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootShowcase, settle, sha256 } from './atlas-kit.js';
import { renderAtlasReport, type ReportEntry } from './atlas-report.js';

// SpaceGraphJ reference-style captures: crimson graph ribbons and a compound widget dashboard that
// is laid out as a subgraph and zoomed as one unit. Frames land in docs/screenshots/retro-style/.

const OUT = process.env.SG_RETRO_DIR ?? resolve('docs/screenshots/retro-style');

type Position = { id: string; x: number; y: number };
type RetroApi = {
    views(): string[];
    view(): string;
    set(view: string): string;
    setModes(): string[];
    innerMode(): string;
    setInnerMode(mode: string): string;
    zoom(value?: number): number;
    stats(): { nodes: number; edges: number; selected: string; crimson: number };
    positions(): Position[];
    positionOf(id: string): number[] | null;
    focus(id: string): boolean;
    container(): { x: number; y: number; width: number; height: number };
};

test.describe('SpaceGraphJ reference styles', () => {
    test('captures the crimson graph and the zoomable compound widget subgraph', async ({
        page,
    }) => {
        const errors = await bootShowcase(page, 'spacegraphj-retro', '__retroDemo');
        mkdirSync(OUT, { recursive: true });
        const entries: ReportEntry[] = [];
        const hashes = new Map<string, string>();

        const capture = async (
            id: string,
            title: string,
            description: string,
            evidence: string[],
        ) => {
            await settle(page);
            const frame = await page.locator('#app').screenshot();
            const digest = sha256(frame);
            hashes.set(id, digest);
            writeFileSync(resolve(OUT, `${id}.png`), frame);
            entries.push({
                id,
                title,
                description,
                file: `${id}.png`,
                bytes: frame.length,
                ms: 0,
                errors: [],
                evidence,
            });
        };

        // Graph view — near-black canvas, serif cards, crimson ribbons, white selection.
        const stats = await page.evaluate(() => ((window as any).__retroDemo as RetroApi).stats());
        expect(stats.nodes).toBeGreaterThan(10);
        expect(stats.edges).toBeGreaterThan(3);
        expect(stats.crimson).toBe(0x620025);
        await expect(page.locator('.html-node-container').first()).toBeVisible();
        await capture(
            'graph-overview',
            'Graph view — overview',
            'Serif glyph cards on near-black, thick crimson ribbons, white selected outline.',
            [
                `${stats.nodes} nodes · ${stats.edges} edges`,
                `selection ${stats.selected}`,
                'edge #620025',
            ],
        );

        const zoomed = await page.evaluate(() => {
            const demo = (window as any).__retroDemo as RetroApi;
            demo.zoom(0.46);
            return demo.zoom();
        });
        expect(zoomed).toBeGreaterThan(0.4);
        await capture(
            'graph-zoom',
            'Graph view — zoomed',
            'The same ribbon subgraph at a closer normalized camera zoom.',
            [`normalized zoom ${zoomed.toFixed(2)}`],
        );

        // GUI view — compound widgets arranged inside a subgraph container.
        expect(
            await page.evaluate(() => ((window as any).__retroDemo as RetroApi).set('gui')),
        ).toBe('gui');
        await expect(page.locator('.html-node-container').first()).toBeVisible();
        const dashboardPosition = await page.evaluate(() =>
            ((window as any).__retroDemo as RetroApi).positionOf('dashboard'),
        );
        expect(
            Math.abs(dashboardPosition?.[0] ?? 9999),
            'dashboard centred for gui view',
        ).toBeLessThan(1);
        const parkedGlyph = await page.evaluate(() =>
            ((window as any).__retroDemo as RetroApi).positionOf('glyph-0'),
        );
        expect(parkedGlyph?.[0] ?? 0, 'graph parked away from gui view').toBeGreaterThan(5000);
        const widgets = await page.locator('.html-node-container').count();
        expect(widgets).toBeGreaterThanOrEqual(4);
        await capture(
            'gui-overview',
            'Compound widget GUI — overview',
            'Wave plots, tab strip, side buttons, slider and status panels in one subgraph.',
            [`${widgets} DOM widget nodes`, 'subgraph container with data.parent children'],
        );

        const before = await page.evaluate(() => {
            const demo = (window as any).__retroDemo as RetroApi;
            const box = document.querySelector('.html-node-container')?.getBoundingClientRect();
            return box ? { width: box.width, height: box.height } : { width: 0, height: 0 };
        });
        const midZoom = await page.evaluate(() => {
            const demo = (window as any).__retroDemo as RetroApi;
            demo.zoom(0.44);
            return demo.zoom();
        });
        await settle(page);
        const after = await page.evaluate(() => {
            const box = document.querySelector('.html-node-container')?.getBoundingClientRect();
            return box ? { width: box.width, height: box.height } : { width: 0, height: 0 };
        });
        expect(midZoom).toBeGreaterThan(0.4);
        expect(after.width, 'DOM widgets scale with camera zoom').toBeGreaterThan(before.width);
        await capture(
            'gui-zoom-mid',
            'Compound widget GUI — zoomed in',
            'Camera zoom keeps the DOM widgets crisp; their screen size grows with the graph.',
            [
                `normalized zoom ${midZoom.toFixed(2)}`,
                `widget ${Math.round(before.width)}px → ${Math.round(after.width)}px`,
            ],
        );

        await page.evaluate(() => (window as any).__retroDemo.zoom(3.6));
        await capture(
            'gui-zoom-close',
            'Compound widget GUI — close-up',
            'Close inspection of the zoomable widget assembly.',
            ['normalized zoom 0.52', 'waveform + tab strip detail'],
        );

        // Inner layout of the widget subgraph.
        const modes = await page.evaluate(() =>
            ((window as any).__retroDemo as RetroApi).setModes(),
        );
        expect(modes).toEqual(expect.arrayContaining(['grid', 'column', 'row']));
        const signatures = new Set<string>();
        for (const mode of modes) {
            expect(
                await page.evaluate(
                    (choice) => ((window as any).__retroDemo as RetroApi).setInnerMode(choice),
                    mode,
                ),
            ).toBe(mode);
            const positions = await page.evaluate(() =>
                ((window as any).__retroDemo as RetroApi).positions(),
            );
            const columns = new Set(positions.map((position) => Math.round(position.x))).size;
            const rows = new Set(positions.map((position) => Math.round(position.y))).size;
            signatures.add(`${columns}x${rows}`);
            await page.evaluate(() => (window as any).__retroDemo.zoom(1.4));
            await capture(
                `gui-inner-${mode}`,
                `Widget inner layout — ${mode}`,
                `${positions.length} widgets · ${columns} columns × ${rows} rows`,
                [
                    `signature ${columns}x${rows}`,
                    ...positions
                        .slice(0, 3)
                        .map((p) => `${p.id}: ${Math.round(p.x)},${Math.round(p.y)}`),
                ],
            );
        }
        expect(signatures.size).toBe(modes.length);
        expect(new Set([...hashes.values()]).size).toBeGreaterThanOrEqual(entries.length - 1);
        expect(errors).toEqual([]);

        const group = {
            id: 'retro-style',
            title: 'SpaceGraphJ reference styles',
            summary:
                'Crimson ribbon graph and a zoomable compound widget dashboard arranged through a subgraph container.',
            entries,
        };
        writeFileSync(resolve(OUT, 'retro-style.json'), JSON.stringify(group, null, 2));
        writeFileSync(
            resolve(OUT, 'index.html'),
            renderAtlasReport('SpaceGraphJS — SpaceGraphJ style study', [group]),
        );
    });
});
