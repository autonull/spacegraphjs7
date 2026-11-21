import { expect, test } from '@playwright/test';

type WorldState = {
    domains: readonly string[];
    nodes: Readonly<Record<string, readonly string[]>>;
    portals: readonly string[];
    modelNodes: number;
    renderers: number;
    canvases: number;
    crossEdges: number;
    tracePath: readonly string[];
    traceProgress: () => number;
    traceFocus: () => string | undefined;
    focusStep: (index: number) => void;
    cameraCenter: () => readonly number[];
};

declare global {
    interface Window {
        __world: WorldState;
    }
}

const probe = () => window.__world;

test.describe('one-canvas world', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/html/layout/one-world.html');
        await page.waitForFunction(() => window.__world !== undefined, { timeout: 20_000 });
    });

    test('four domains share one simulation and one camera', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        const state = await page.evaluate(probe);
        expect(state.domains).toEqual(['agent', 'workflow', 'filesystem', 'data']);
        expect(state.nodes.agent).toContain('agent:r:session');
        expect(state.nodes.data).toContain('data:p1:auc');
        expect(state.portals).toEqual([
            'world/portal:agent',
            'world/portal:workflow',
            'world/portal:filesystem',
            'world/portal:data',
        ]);
        expect(state.modelNodes).toBeGreaterThan(state.portals.length);
        expect(state.renderers).toBe(1);
        expect(state.canvases).toBe(1);
        expect(state.crossEdges).toBe(3);
        await expect(page.locator('#status')).toContainText('1 simulation · 1 camera');
        expect(errors).toEqual([]);
    });

    test('one trace flies a single camera across the qualified world path', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        const state = await page.evaluate(probe);
        expect(state.tracePath).toEqual([
            'world/domain:data/data:p1:auc',
            'world/domain:filesystem/filesystem:c1:edit',
            'world/domain:filesystem/filesystem:c1:session',
            'world/domain:workflow/workflow:wf:out',
            'world/domain:workflow/workflow:wf:compile',
            'world/domain:agent/agent:r:session',
        ]);

        const before = await page.evaluate(() => window.__world.cameraCenter());
        await page.evaluate((index) => window.__world.focusStep(index), 5);
        await expect
            .poll(() => page.evaluate(() => window.__world.cameraCenter()))
            .not.toEqual(before);
        expect(
            await page.evaluate(() => ({
                progress: window.__world.traceProgress(),
                focus: window.__world.traceFocus(),
            })),
        ).toEqual({ progress: 5, focus: 'world/domain:agent/agent:r:session' });
        await expect(page.locator('#trace-status')).toContainText('agent:r:session');
        expect(errors).toEqual([]);
    });
});
