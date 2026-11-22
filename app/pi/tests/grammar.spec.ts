import { expect, test, type Page } from '@playwright/test';

const settled = async (page: Page): Promise<void> => {
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.simulation().settled), {
            timeout: 10_000,
        })
        .toBe(true);
};

const boot = async (page: Page): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await settled(page);
    await page.evaluate(() => (window as any).__pi.loadFixture());
    await settled(page);
    return errors;
};

const failedNode = (page: Page): Promise<string | null> =>
    page.evaluate(() => {
        const card = document.querySelector('#canvas [data-status="failed"]');
        return card?.closest('[data-node]')?.getAttribute('data-node') ?? null;
    });

const reveal = async (page: Page, id: string): Promise<void> => {
    await page.evaluate((nodeId) => (window as any).__pi.reveal(nodeId), id);
    await expect(page.locator('#focus-lens')).toBeVisible();
};

const focusFailure = async (page: Page): Promise<void> => {
    const id =
        (await failedNode(page)) ??
        (await page.evaluate(() => (window as any).__pi.edges()[0].target as string));
    await reveal(page, id);
};

test.describe('the graph grammar', () => {
    test('cards carry structure, square corners and one severity channel', async ({ page }) => {
        const errors = await boot(page);
        await focusFailure(page);
        const grammar = await page.evaluate(() => {
            const cards = [...document.querySelectorAll('#canvas [data-rung]')];
            const failed = cards.find((card) => card.getAttribute('data-status') === 'failed');
            const shape = failed?.querySelector(':scope > .rung-shape');
            const style = shape ? getComputedStyle(shape) : undefined;
            return {
                cards: cards.length,
                shaped: cards.filter((card) => card.querySelector(':scope > .rung-shape')).length,
                focused: cards.filter((card) => card.getAttribute('data-focus') === 'focus').length,
                radius: failed ? getComputedStyle(failed).borderRadius : 'missing',
                severityWidth: style?.borderLeftWidth ?? 'missing',
                severityColor: style?.borderLeftColor ?? 'missing',
                viewSeverity: getComputedStyle(document.documentElement)
                    .getPropertyValue('--view-severity')
                    .trim(),
            };
        });
        expect(grammar.cards).toBeGreaterThan(0);
        expect(grammar.shaped).toBe(grammar.cards);
        expect(grammar.focused).toBeGreaterThan(0);
        expect(grammar.radius).toBe('0px');
        expect(grammar.severityWidth).toBe('3px');
        expect(grammar.severityColor).not.toBe('');
        expect(grammar.viewSeverity).toMatch(/^#/);
        expect(errors).toEqual([]);
    });

    test('a focus ring and a one-pixel connector follow the node', async ({ page }) => {
        const errors = await boot(page);
        await focusFailure(page);
        const ring = await page.locator('#canvas [data-rung][data-focus="focus"]').first().evaluate(
            (element) => getComputedStyle(element).outlineWidth,
        );
        expect(ring).toBe('1px');
        await expect(page.locator('#focus-connector')).toBeVisible();
        const endpoints = await page.locator('#focus-connector line').evaluate((line) => ({
            x1: Number(line.getAttribute('x1')),
            y1: Number(line.getAttribute('y1')),
            x2: Number(line.getAttribute('x2')),
            y2: Number(line.getAttribute('y2')),
            stroke: getComputedStyle(line).strokeWidth,
        }));
        for (const value of [endpoints.x1, endpoints.y1, endpoints.x2, endpoints.y2])
            expect(Number.isFinite(value)).toBe(true);
        expect(endpoints.stroke).toBe('1px');
        await page.locator('#inspector-pin').click();
        await expect(page.locator('#focus-connector')).toBeVisible();
        expect(errors).toEqual([]);
    });

    test('a focused scope draws a contour and quiet lane bands', async ({ page }) => {
        const errors = await boot(page);
        const portal = await page.evaluate(() => (window as any).__pi.portalNodes()[0] as string);
        expect(portal).toBeTruthy();
        await reveal(page, portal);
        const scope = await page.evaluate(() => {
            const bands = getComputedStyle(document.querySelector('#canvas')!, '::before');
            const frames = [...document.querySelectorAll('#canvas [data-portal] > .rung-shape')];
            return {
                focus: document.documentElement.dataset.scopeFocus ?? '',
                bands: bands.backgroundImage,
                frameOutline: frames.length
                    ? getComputedStyle(frames[0]!).outlineWidth
                    : 'missing',
            };
        });
        expect(scope.focus).toBeTruthy();
        expect(scope.bands).toContain('repeating-linear-gradient');
        expect(scope.frameOutline).toBe('1px');
        expect(errors).toEqual([]);
    });

    test('palette roles resolve in both themes', async ({ page }) => {
        const errors = await boot(page);
        const dark = await page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--view-context').trim(),
        );
        expect(dark).toMatch(/^#/);
        await page.evaluate(() =>
            (window as any).__pi.setPolicyLayer('url', { 'theme.variant': 'light' }),
        );
        const light = await page.evaluate(() => ({
            background: getComputedStyle(document.documentElement)
                .getPropertyValue('--sg-colors-background')
                .trim(),
            scope: getComputedStyle(document.documentElement).getPropertyValue('--view-scope').trim(),
        }));
        expect(light.background).toBe('#f7f7f7');
        expect(light.scope).toMatch(/^#/);
        expect(errors).toEqual([]);
    });

    test('inspector controls meet the ergonomic target', async ({ page }) => {
        await boot(page);
        await focusFailure(page);
        const sizes = await page.evaluate(() =>
            [...document.querySelectorAll('#focus-lens .inspector-tabs button, #inspector-pin')].map(
                (element) => {
                    const rect = element.getBoundingClientRect();
                    return { width: rect.width, height: rect.height };
                },
            ),
        );
        expect(sizes.length).toBeGreaterThanOrEqual(5);
        for (const size of sizes) {
            expect(size.width).toBeGreaterThanOrEqual(44);
            expect(size.height).toBeGreaterThanOrEqual(44);
        }
    });

    test('camera flights stay smooth while the inspector follows', async ({ page }) => {
        const errors = await boot(page);
        await focusFailure(page);
        const p95 = await page.evaluate(async () => {
            const pi = (window as any).__pi;
            const stamps: number[] = [];
            let running = true;
            const sample = (now: number): void => {
                stamps.push(now);
                if (running) requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
            pi.traverseEdge(pi.edges()[0].id);
            await new Promise((done) => setTimeout(done, 1100));
            running = false;
            const deltas = stamps.slice(1).map((stamp, index) => stamp - stamps[index]!).sort(
                (a, b) => a - b,
            );
            return deltas[Math.floor(deltas.length * 0.95)] ?? Infinity;
        });
        expect(p95).toBeLessThan(120);
        expect(errors).toEqual([]);
    });

    test('reduced motion reaches the final frame immediately', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const errors = await boot(page);
        const immediate = await page.evaluate(async () => {
            const pi = (window as any).__pi;
            pi.traverseEdge(pi.edges()[0].id);
            await new Promise((done) => setTimeout(done, 120));
            pi.pause(true);
            return pi.viewport();
        });
        await page.waitForTimeout(1200);
        const later = await page.evaluate(() => (window as any).__pi.viewport());
        expect(later.center).toEqual(immediate.center);
        expect(later.zoom).toBeCloseTo(immediate.zoom, 2);
        expect(errors).toEqual([]);
    });
});
