import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// P5.1 — cartesian visual evidence. The explorer is the only surface where every declared axis is
// switchable, so the matrix capture drives it cell by cell. Each cell is one picture, the sample
// metadata is written beside the frames. Byte hashes are not a gate (timing/antialiasing vary); the
// effective visible-axis config is the stable signature. A signature collision across representation
// rungs fails the run, because ten names for one picture are not ten observations.
const CAPTURE_DIR = process.env.SG_CAPTURE_DIR ?? resolve('test-results/matrix');
const FRAME = '#left-graph';
// Depth, projection and emphasis can be no-ops for a given renderer or representation. Those
// are kept as evidence. A representation change must always change the effective config, so a
// signature collision across LOD rungs is a defect.
const VISIBLE_AXES = new Set(['lod']);

async function boot(page: Page) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text());
    });
    await page.goto('/explorer.html');
    await page.waitForFunction(() => (window as any).__ready === true);
    await page.evaluate(() => document.fonts.ready);
    return errors;
}

async function applyCell(page: Page, values: Readonly<Record<string, string>>) {
    await page.evaluate((record) => {
        for (const [axis, value] of Object.entries(record)) (window as any).__explorer.set(axis, value);
    }, values);
    await page.evaluate(
        () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
    );
}

test.describe('cartesian capture matrix (P5.1)', () => {
    test('captures every sampled cell with distinct, legible frames', async ({ page }) => {
        const errors = await boot(page);
        const matrix = await page.evaluate(() => (window as any).__explorer.matrix());
        expect(matrix.cells.length).toBeGreaterThan(1);
        expect(matrix.sampled).toBe(matrix.cells.length);

        if (CAPTURE_DIR) mkdirSync(CAPTURE_DIR, { recursive: true });
        const signatures = new Map<string, string>();
        const frames: { id: string; values: Record<string, string>; signature: string }[] = [];
        const duplicates: { cells: string[]; differingAxes: string[] }[] = [];

        for (const [index, cell] of matrix.cells.entries()) {
            await applyCell(page, cell.values);

            const config = await page.evaluate(() => (window as any).__explorer.config() as Record<string, string>);
            for (const [axis, value] of Object.entries(cell.values)) {
                expect(config[axis], `${cell.id}: ${axis}`).toBe(value);
            }

            const nodes = await page.evaluate(() => (window as any).__explorer.nodes() as number[]);
            expect(nodes[0], cell.id).toBeGreaterThan(0);
            await expect(page.locator(`${FRAME} svg`)).toBeVisible();

            const legibility = await page.evaluate((selector) => {
                const shapes = [...document.querySelectorAll<SVGElement>(
                    `${selector} svg circle, ${selector} svg rect, ${selector} svg text`,
                )].filter((shape) => shape.getClientRects().length > 0);
                const texts = shapes.filter((shape) => shape.tagName === 'text');
                const sizes = texts.map((text) => Number.parseFloat(getComputedStyle(text).fontSize));
                return {
                    shapes: shapes.length,
                    texts: texts.length,
                    minSize: sizes.length ? Math.min(...sizes) : 0,
                };
            }, FRAME);
            expect(legibility.shapes, cell.id).toBeGreaterThan(0);
            if (legibility.texts > 0) expect(legibility.minSize, cell.id).toBeGreaterThanOrEqual(9);

            const frame = await page.locator(FRAME).screenshot();
            expect(frame.length, cell.id).toBeGreaterThan(0);

            // Byte hashes of screenshots are not a gate — timing and antialiasing change the bytes
            // across runs. The effective visible-axis config is the stable, reviewable signature.
            const signature = [...VISIBLE_AXES].map((axis) => `${axis}=${config[axis]}`).join(',');
            expect(signature, cell.id).not.toBe('');
            const previous = signatures.get(signature);
            if (previous) {
                const earlier = frames.find((entry) => entry.signature === signature)!;
                const differingAxes = Object.keys(cell.values).filter(
                    (axis) => earlier.values[axis] !== cell.values[axis],
                );
                const expectedChange = differingAxes.filter((axis) => VISIBLE_AXES.has(axis));
                expect(expectedChange, `config signature collision for ${cell.id} and ${previous}`).toEqual([]);
                duplicates.push({ cells: [previous, cell.id], differingAxes });
            }
            signatures.set(signature, cell.id);
            frames.push({ id: cell.id, values: { ...cell.values }, signature });

            if (CAPTURE_DIR) {
                const tag = createHash('sha256').update(signature).digest('hex').slice(0, 10);
                writeFileSync(resolve(CAPTURE_DIR, `${String(index).padStart(2, '0')}-${tag}.png`), frame);
            }
        }

        if (CAPTURE_DIR) {
            writeFileSync(
                resolve(CAPTURE_DIR, 'matrix.json'),
                JSON.stringify({ ...matrix, frames, duplicates }, null, 2),
            );
        }
        expect(errors).toEqual([]);
    });
});
