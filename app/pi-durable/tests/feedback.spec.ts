import { expect, test } from '@playwright/test';
import { boot } from './boot';

test('an unknown Lens command stays visible and keeps the query', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await page.fill('#lens-input', 'show diff');
    await page.press('#lens-input', 'Enter');
    await expect(page.locator('#lens-error')).toContainText('Unknown command: show diff');
    await expect(page.locator('#lens-input')).toHaveValue('show diff');
    expect(errors).toEqual([]);
});

test('a failed prompt shows a visible error and keeps the text', async ({ page }) => {
    const errors = await boot(page);
    await page.route('**/api/conversations/**/prompt', async (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }),
    );
    await page.fill('#prompt-input', 'recover me');
    await page.click('#prompt-submit');
    await expect(page.locator('#prompt-error')).toContainText('boom');
    await expect(page.locator('#prompt-input')).toHaveValue('recover me');
    expect(errors).toEqual([]);
});
