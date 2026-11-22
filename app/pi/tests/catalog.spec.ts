import { expect, test } from '@playwright/test';
import { boot } from './boot';

test('catalog groups evidence and exposes one canonical question list', async ({ page }) => {
    const errors = await boot(page);
    await page.evaluate(() => (window as any).__pi.toggleCatalog(true));
    await expect(page.locator('#catalog [data-group]')).toHaveCount(3);
    await expect(page.locator('#catalog [data-group="presets"]')).toBeVisible();
    await expect(page.locator('#catalog [data-group="experiments"]')).toBeVisible();
    await expect(page.locator('#catalog [data-group="questions"]')).toBeVisible();

    const questions = await page.locator('#catalog [data-question]').evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-question')),
    );
    expect(questions).toEqual([
        'question-1',
        'question-2',
        'question-3',
        'question-4',
        'question-5',
    ]);

    const search = page.locator('#catalog .catalog-search');
    const box = await search.boundingBox();
    expect(box?.height).toBe(40);
    const total = await page.locator('#catalog .catalog-card').count();
    await search.fill('session.ts');
    await expect.poll(() => page.locator('#catalog .catalog-card:visible').count()).toBeLessThan(total);
    await search.fill('');
    await expect.poll(() => page.locator('#catalog .catalog-card:visible').count()).toBe(total);
    expect(errors).toEqual([]);
});

test('both question entry points open the canonical list and a question runs its evidence', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => (window as any).__pi.openRailPanel('rail-learn'));
    await page.locator('#guided-replay').click();
    await expect(page.locator('#catalog [data-group="questions"] .catalog-card').first()).toBeVisible();
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-question'));
    expect(focused).toBe('question-1');

    await page.locator('#catalog [data-question="question-3"]').click();
    await expect.poll(() => page.locator('#evidence').textContent()).toContain('delegations:');
    expect(await page.evaluate(() => window.location.hash)).toBe('#question-question-3');
});
