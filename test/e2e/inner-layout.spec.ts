import { expect, test } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootShowcase, settle } from './atlas-kit.js';
import { renderAtlasReport, type ReportEntry } from './atlas-report.js';

// Inner-node layouts through a subgraph container. The demo owns the geometry; this spec drives
// its mode control, verifies the child positions change shape, and captures one frame per mode.

const OUT = process.env.SG_INNER_LAYOUT_DIR ?? resolve('docs/screenshots/inner-layout');

type Position = { id: string; x: number; y: number };

interface InnerLayoutApi {
    modes(): string[];
    mode(): string;
    set(mode: string): string;
    positions(): Position[];
    container(): { x: number; y: number; width: number; height: number };
}

const rounded = (values: number[]) =>
    [...new Set(values.map((value) => Math.round(value)))].sort((a, b) => a - b);

function signature(positions: Position[]) {
    return {
        columns: rounded(positions.map((position) => position.x)).length,
        rows: rounded(positions.map((position) => position.y)).length,
        ids: positions.map((position) => position.id).join(','),
    };
}

test.describe('inner-node layouts via subgraphs', () => {
    test('switches grid, column and row layouts inside one container node', async ({ page }) => {
        const errors = await bootShowcase(page, 'inner-layout', '__innerLayoutDemo');
        mkdirSync(OUT, { recursive: true });
        const modes = await page.evaluate(
            () => (window as any).__innerLayoutDemo.modes() as string[],
        );
        expect(modes).toEqual(expect.arrayContaining(['grid', 'column', 'row']));

        const entries: ReportEntry[] = [];
        const signatures: Record<string, ReturnType<typeof signature>> = {};

        for (const mode of modes) {
            const applied = await page.evaluate((choice) => {
                const demo = (window as any).__innerLayoutDemo as InnerLayoutApi;
                return demo.set(choice);
            }, mode);
            expect(applied, mode).toBe(mode);
            await settle(page);

            const positions = await page.evaluate(() =>
                ((window as any).__innerLayoutDemo as InnerLayoutApi).positions(),
            );
            const container = await page.evaluate(() =>
                ((window as any).__innerLayoutDemo as InnerLayoutApi).container(),
            );
            expect(positions.length, mode).toBeGreaterThan(3);
            expect(container.width, mode).toBeGreaterThan(0);
            expect(container.height, mode).toBeGreaterThan(0);
            const shape = signature(positions);
            signatures[mode] = shape;

            if (mode === 'grid') {
                expect(shape.columns, mode).toBeGreaterThan(1);
                expect(shape.rows, mode).toBeGreaterThan(1);
            }
            if (mode === 'column') {
                expect(shape.columns, mode).toBe(1);
                expect(shape.rows, mode).toBeGreaterThan(2);
            }
            if (mode === 'row') {
                expect(shape.rows, mode).toBe(1);
                expect(shape.columns, mode).toBeGreaterThan(2);
            }

            const file = `${mode}.png`;
            const frame = await page.locator('#app').screenshot();
            expect(frame.length, mode).toBeGreaterThan(0);
            writeFileSync(resolve(OUT, file), frame);
            entries.push({
                id: mode,
                title: `Inner layout: ${mode}`,
                description: `${positions.length} child nodes · ${shape.columns} columns × ${shape.rows} rows`,
                file,
                bytes: frame.length,
                ms: 0,
                errors: [],
                evidence: [
                    `container ${Math.round(container.width)}×${Math.round(container.height)}`,
                    ...positions
                        .slice(0, 4)
                        .map((p) => `${p.id}: ${Math.round(p.x)},${Math.round(p.y)}`),
                ],
            });
        }

        expect(new Set(Object.values(signatures).map((value) => JSON.stringify(value))).size).toBe(
            modes.length,
        );
        // Evidence check, not byte identity: one distinct frame artifact per mode, with non-empty
        // bytes asserted in the loop. Geometry/signature distinctness is gated just above.
        expect(new Set(entries.map((entry) => entry.file)).size).toBe(modes.length);
        expect(errors).toEqual([]);

        writeFileSync(
            resolve(OUT, 'inner-layout.json'),
            JSON.stringify(
                {
                    id: 'inner-layout',
                    title: 'Inner-node layouts (subgraph container)',
                    summary:
                        'One container node, three arrangement modes. Mode switches are driven through the demo hook and verified by child positions.',
                    entries,
                },
                null,
                2,
            ),
        );
        writeFileSync(
            resolve(OUT, 'index.html'),
            renderAtlasReport('SpaceGraphJS — inner-node layout modes', [
                JSON.parse(readFileSync(resolve(OUT, 'inner-layout.json'), 'utf8')),
            ]),
        );
    });
});
