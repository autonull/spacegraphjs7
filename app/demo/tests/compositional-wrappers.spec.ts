import { expect, test } from '@playwright/test';

type CrossTraceStep = { domain: string; node: string; via?: string };

type CompositionalState = {
    domains: readonly string[];
    nodes: Readonly<Record<string, readonly string[]>>;
    links: readonly string[];
    endpoints: readonly { source: string; target: string }[];
    overlayPaths: number;
    isolated: boolean;
    tracePath: readonly CrossTraceStep[];
    traceProgress: () => number;
    traceFocus: () => string | undefined;
    focusStep: (index: number) => void;
    viewportOf: (domain: string) => readonly number[] | null;
};

declare global {
    interface Window {
        __compositional: CompositionalState;
    }
}

const probe = () => window.__compositional;

test.describe('compositional domain wrappers', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/html/layout/compositional-wrappers.html');
        await page.waitForFunction(() => window.__compositional !== undefined, {
            timeout: 20_000,
        });
    });

    test('four isolated graphs share three inter-graph overlay links', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        const state = await page.evaluate(probe);
        expect(state.domains).toEqual(['agent', 'workflow', 'filesystem', 'data']);
        expect(state.nodes.agent).toContain('agent:r:session');
        expect(state.nodes.workflow).toContain('workflow:wf:compile');
        expect(state.nodes.filesystem).toContain('filesystem:c1:session');
        expect(state.nodes.data).toContain('data:p1:auc');
        expect(state.links).toHaveLength(3);
        expect(state.endpoints).toEqual([
            { source: 'agent:r:session', target: 'workflow:wf:compile' },
            { source: 'workflow:wf:out', target: 'filesystem:c1:session' },
            { source: 'filesystem:c1:edit', target: 'data:p1:auc' },
        ]);
        expect(state.isolated).toBe(true);
        expect(state.overlayPaths).toBe(3);

        const paths = page.locator('#spacegraph-intergraph-overlay path');
        await expect(paths).toHaveCount(3);
        for (const path of await paths.all()) {
            await expect
                .poll(() => path.getAttribute('d'), { timeout: 5_000 })
                .toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
        }
        await expect(page.locator('#status')).toContainText('3 inter-graph links');
        expect(errors).toEqual([]);
    });

    test('one trace follows the links across canvases without merging models', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        const path = await page.evaluate(() => window.__compositional.tracePath);
        expect(path.map((step) => step.node)).toEqual([
            'data:p1:auc',
            'filesystem:c1:edit',
            'filesystem:c1:session',
            'workflow:wf:out',
            'workflow:wf:compile',
            'agent:r:session',
        ]);

        const before = await page.evaluate(() => window.__compositional.viewportOf('agent'));
        await page.evaluate((index) => window.__compositional.focusStep(index), 5);
        await expect
            .poll(() => page.evaluate(() => window.__compositional.viewportOf('agent')))
            .not.toEqual(before);
        expect(
            await page.evaluate(() => ({
                progress: window.__compositional.traceProgress(),
                focus: window.__compositional.traceFocus(),
                isolated: window.__compositional.isolated,
                overlayPaths: window.__compositional.overlayPaths,
            })),
        ).toEqual({ progress: 5, focus: 'agent:r:session', isolated: true, overlayPaths: 3 });
        await expect(page.locator('#trace-status')).toContainText('agent:r:session');
        expect(errors).toEqual([]);
    });
});
