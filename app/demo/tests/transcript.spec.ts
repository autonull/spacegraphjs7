import { expect, test } from '@playwright/test';

const expanded = (page: import('@playwright/test').Page): Promise<string[]> =>
    page.evaluate(() =>
        (window as unknown as { __transcript: { expanded(): string[] } }).__transcript.expanded(),
    );

test('transcript rows toggle an expandable detail panel', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/html/interaction/transcript.html');
    await page.waitForFunction(() => Boolean((window as { __transcript?: unknown }).__transcript));

    const row = page.locator('.row[data-node="e1"]');
    await row.click();
    const detail = page.locator('.row-wrap:has(.row[data-node="e1"]) .row-detail');
    await expect(detail).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Center' })).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Children' })).toBeVisible();
    await expect(detail.locator('.row-detail-body')).toHaveText('1 failure · vitest');
    expect(await expanded(page)).toContain('e1');

    await row.click();
    await expect(detail).toHaveCount(0);
    expect(await expanded(page)).not.toContain('e1');
    expect(errors).toEqual([]);
});

test('arrow keys and Home/End move through transcript rows', async ({ page }) => {
    await page.goto('/html/interaction/transcript.html');
    await page.waitForFunction(() => Boolean((window as { __transcript?: unknown }).__transcript));
    const first = page.locator('.row').first();
    await first.click();
    await expect(first).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.row').nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.locator('.row').last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('.row').first()).toBeFocused();
});
