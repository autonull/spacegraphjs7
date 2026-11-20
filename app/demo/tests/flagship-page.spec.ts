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

        await expect(page.locator('#run')).toContainText('PI_LOCAL_FEED=1 pnpm --filter pi dev');
        await expect(page.locator('#run')).toContainText('pnpm --filter pi verify:visual');
        await expect(page.getByRole('link', { name: 'Back to the demo gallery' })).toHaveAttribute(
            'href',
            './',
        );
        expect(errors).toEqual([]);
    });
});
