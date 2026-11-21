import { expect, test } from '@playwright/test';

type GraphIdeProbe = {
    ready: boolean;
    surface: () => string;
    setSurface: (value: string) => string;
    files: () => { id: string; label: string; path: string; change?: string }[];
    changes: () => { id: string; path: string; producers: string[] }[];
    dependencies: () => Record<string, string[]>;
    features: () => string[];
    nodes: () => string[];
    selected: () => string;
    selectFile: (id: string) => void;
    sensorySupport: () => boolean;
    register: () => void;
    unregister: () => void;
    events: () => string[];
};

declare global {
    interface Window {
        __graphIde: GraphIdeProbe;
    }
}

test.describe('Graph IDE reference host', () => {
    test('shows filesystem panels and gates the console sensory adapter', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/html/layout/graph-ide.html');
        await page.waitForFunction(() => window.__graphIde?.ready === true, { timeout: 20_000 });

        const files = await page.evaluate(() => window.__graphIde.files());
        const changes = await page.evaluate(() => window.__graphIde.changes());
        const nodes = await page.evaluate(() => window.__graphIde.nodes());
        expect(files.map((file) => file.path)).toEqual(['src/auth/session.ts']);
        expect(files[0].change).toBeTruthy();
        expect(changes[0].producers).toEqual(['refresh']);
        expect(nodes.length).toBeGreaterThan(3);

        expect(await page.evaluate(() => window.__graphIde.features())).toEqual(['trails']);
        await expect(page.locator('#diff')).toContainText('dependency trail overlay: on');
        expect(await page.evaluate(() => window.__graphIde.setSurface('detail'))).toBe('detail');
        await expect(page.locator('[data-set-surface="detail"]')).toHaveAttribute(
            'data-active',
            'true',
        );

        expect(await page.evaluate(() => window.__graphIde.sensorySupport())).toBe(false);
        await expect(page.locator('#sensory')).toContainText('unsupported');
        const selected = files[0].id;
        await page.evaluate((id) => window.__graphIde.selectFile(id), selected);
        expect(await page.evaluate(() => window.__graphIde.events())).toEqual([]);

        await page.evaluate(() => window.__graphIde.register());
        expect(await page.evaluate(() => window.__graphIde.sensorySupport())).toBe(true);
        await expect(page.locator('#sensory')).toContainText('supported');
        await page.evaluate((id) => window.__graphIde.selectFile(id), selected);
        expect(await page.evaluate(() => window.__graphIde.events())).toEqual([
            `reveal:${selected}`,
        ]);

        await page.evaluate(() => window.__graphIde.unregister());
        expect(await page.evaluate(() => window.__graphIde.sensorySupport())).toBe(false);
        expect(errors).toEqual([]);
    });
});
