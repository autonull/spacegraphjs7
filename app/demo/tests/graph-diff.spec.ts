import { expect, test } from '@playwright/test';

type DiffSummary = {
    before: { version: number; label: string; nodes: number; edges: number };
    after: { version: number; label: string; nodes: number; edges: number };
    nodes: { added: string[]; removed: string[]; changed: string[] };
    edges: { added: string[]; removed: string[]; changed: string[] };
    changedNodes: { id: string; before: string; after: string }[];
};

declare global {
    interface Window {
        __graphDiff: { runs: number[]; summary: DiffSummary; derived: boolean };
    }
}

test.describe('history-derived graph diff', () => {
    test('shows two runs and a diff recomputed from kernel history', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto('/html/layout/graph-diff.html');
        await page.waitForFunction(() => window.__graphDiff !== undefined, { timeout: 20_000 });

        const state = await page.evaluate(() => window.__graphDiff);
        expect(state.runs).toEqual([8, 3]);
        expect(state.derived).toBe(true);
        expect(state.summary.before.version).toBe(3);
        expect(state.summary.after.version).toBe(8);
        expect(state.summary.nodes).toEqual({
            added: ['test'],
            removed: ['legacy'],
            changed: ['session'],
        });
        expect(state.summary.edges).toEqual({ added: ['e2'], removed: ['e1'], changed: [] });

        await expect(page.locator('#run-before li')).toHaveText([
            'session.ts (draft)',
            'legacy.ts',
        ]);
        await expect(page.locator('#run-after li')).toHaveText([
            'session.ts (fixed)',
            'session.test.ts',
        ]);
        await expect(page.locator('#diff li[data-tone="added"]')).toHaveText(['test', 'edge e2']);
        await expect(page.locator('#diff li[data-tone="removed"]')).toHaveText([
            'legacy',
            'edge e1',
        ]);
        await expect(page.locator('#diff li[data-tone="changed"]')).toHaveText([
            'session.ts (draft) → session.ts (fixed)',
        ]);
        await expect(page.locator('#provenance')).toContainText('recomputed from history: true');
        expect(errors).toEqual([]);
    });
});
