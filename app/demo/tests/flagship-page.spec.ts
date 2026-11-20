import { expect, test } from '@playwright/test';

test.describe('flagship landing page', () => {
    test('renders the screenshots and the one-command quickstart', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto('/flagship.html');
        await expect(page.locator('h1')).toHaveText('See the structure of work.');

        const images = page.locator('#screens img');
        await expect(images).toHaveCount(2);
        for (const image of await images.all()) {
            expect(
                await image.evaluate((element: HTMLImageElement) => element.naturalWidth),
            ).toBeGreaterThan(0);
        }

        const video = page.locator('#video video');
        await expect(video).toHaveAttribute('poster', './flagship/flagship.png');
        const source = await video.locator('source').getAttribute('src');
        expect(source).toBe('./flagship/flagship.mp4');
        expect((await page.request.get(new URL(source!, page.url()).toString())).ok()).toBe(true);

        await expect(page.locator('#ladder .rung')).toHaveCount(4);
        expect(
            await page
                .locator('#ladder .rung')
                .evaluateAll((nodes) => nodes.map((node) => node.dataset.rung)),
        ).toEqual(['overview', 'execution', 'detail', 'scope']);
        await expect(page.locator('#worlds')).toContainText('Cross-domain trace');
        await expect(page.locator('#worlds')).toContainText('History-derived diff');
        await expect(
            page.getByRole('link', { name: 'Open the four-domain workspace →' }),
        ).toHaveAttribute('href', './html/layout/compositional-wrappers.html');
        await expect(page.getByRole('link', { name: 'Open the two-run diff →' })).toHaveAttribute(
            'href',
            './html/layout/graph-diff.html',
        );

        await expect(page.locator('#run')).toContainText('PI_LOCAL_FEED=1 pnpm --filter pi dev');
        await expect(page.locator('#run')).toContainText('pnpm --filter pi verify:visual');
        await expect(page.getByRole('link', { name: 'Back to the demo gallery' })).toHaveAttribute(
            'href',
            './',
        );
        expect(errors).toEqual([]);
    });
});
