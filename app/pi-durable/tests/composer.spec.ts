import { expect, test } from '@playwright/test';
import { boot } from './boot';

test('composer keeps multiline drafts, submits on Enter and recalls history', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    const input = page.locator('#prompt-input');
    await input.fill('Line one');
    await input.press('Shift+Enter');
    await page.keyboard.type('Line two');
    expect(await input.inputValue()).toBe('Line one\nLine two');

    await input.press('Enter');
    await expect(page.locator('#announcer')).toContainText('Local answer accepted');
    expect(await input.inputValue()).toBe('');

    await input.press('ArrowUp');
    expect(await input.inputValue()).toBe('Line one\nLine two');
    expect(errors).toEqual([]);
});
