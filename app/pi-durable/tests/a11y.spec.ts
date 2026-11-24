import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('tablist exposes selection, roving focus and RTL arrows', async ({ page }) => {
    await boot(page, '?shot=fork-tabs');
    const tabs = page.locator('#tab-strip [role="tab"]');
    await expect(tabs).toHaveCount(2);
    await expect(page.locator('#tab-strip')).toHaveAttribute('role', 'tablist');
    const active = await call<string>(page, 'activeTab');
    const other = active === '1' ? '2' : '1';
    await expect(page.locator(`[data-tab="${active}"]`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`[data-tab="${active}"]`)).toHaveAttribute('tabindex', '0');
    await expect(page.locator(`[data-tab="${other}"]`)).toHaveAttribute('tabindex', '-1');

    await page.locator(`[data-tab="${active}"]`).focus();
    await page.keyboard.press('ArrowRight');
    expect(await call<string>(page, 'activeTab')).toBe(other);
    await expect(page.locator(`[data-tab="${other}"]`)).toBeFocused();

    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await page.keyboard.press('ArrowRight');
    expect(await call<string>(page, 'activeTab')).toBe(active);
});

test('chrome announces every outcome and has no dead control offline', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    const announcer = page.locator('#announcer');

    await page.click('#view-switch [data-view="tasks"]');
    await expect(announcer).toContainText('tasks view');
    await page.click('#approve-button');
    await expect(announcer).toContainText('Approved');
    await page.click('#fork-button');
    await expect(announcer).toContainText('Forked');
    await page.click('#catalog-button');
    await expect(page.locator('#catalog')).toBeVisible();
    await expect(page.locator('#scenario-list button').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#catalog')).toBeHidden();
    await page.click('#permalink-button');
    await expect(announcer).toContainText('Permalink copied');
    await page.selectOption('#export-format', 'md');
    await expect(announcer).not.toHaveText('');

    const views = page.locator('#view-switch button');
    for (let index = 0; index < (await views.count()); index++) {
        await views.nth(index).click();
        await expect(announcer).toContainText('view');
    }
    expect(errors).toEqual([]);
});

test('narrow viewport keeps controls and graph reachable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await boot(page, '?shot=basic-turn');
    await expect(page.locator('#canvas canvas').first()).toBeVisible();
    await expect(page.locator('#prompt-submit')).toBeInViewport();
    await expect(page.locator('#view-switch')).toBeInViewport();
    await expect(page.locator('#prompt-submit')).toHaveCSS('min-height', '44px');
});
