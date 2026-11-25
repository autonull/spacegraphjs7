import { expect, test } from '@playwright/test';
import { boot, call, openPanel } from './boot';

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
    await openPanel(page);

    await page.click('#view-switch [data-view="tasks"]');
    await expect(announcer).toContainText('tasks view');
    await page.click('#approve-button');
    await expect(announcer).toContainText('Approved');
    await page.click('#fork-button');
    await expect(announcer).toContainText('Forked');
    await page.click('#new-button');
    await expect(announcer).toContainText('New conversation');
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

test('icon rail keeps every control named, tabbable and off hover only', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    const errors = await boot(page, '?shot=basic-turn');
    const icons = page.locator('#rail .rail-icon');
    expect(await icons.count()).toBe(9);
    for (let index = 0; index < (await icons.count()); index++) {
        const icon = icons.nth(index);
        await expect(icon).toHaveAttribute('aria-label', /\S/);
        await expect(icon).toHaveAttribute('title', /\S/);
        await icon.focus();
        await expect(icon).toBeFocused();
    }
    const width = await page.locator('#rail').evaluate((node) => node.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(64);
    const stage = await page.locator('#stage').evaluate((node) => node.getBoundingClientRect().width);
    expect(stage / 1600).toBeGreaterThanOrEqual(0.7);
    expect(errors).toEqual([]);
});

test('shortcut overlay lists the real bindings behind every control', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await page.keyboard.press('?');
    await expect(page.locator('#help')).toBeVisible();
    const text = await page.locator('#help-shortcuts').innerText();
    for (const label of ['Ctrl/⌘ K', 'Shift+F', 'Alt+← / →', 'Esc', 'g', 'f', '0', 'Ctrl+Enter', 'Shift+R', 'n'])
        expect(text).toContain(label);
    await page.locator('#help-close').click();
    await expect(page.locator('#help')).toBeHidden();
    expect(errors).toEqual([]);
});

test('presentation mode hides chrome, keeps the view and exits by keyboard', async ({ page }) => {
    await boot(page, '?shot=basic-turn&rung=passage');
    await call(page, 'lens', 'view trace');
    const before = await call<string>(page, 'permalink');
    await page.keyboard.press('Shift+F');
    await expect(page.locator('#app')).toHaveAttribute('data-present', 'true');
    await expect(page.locator('#rail')).toBeHidden();
    await expect(page.locator('#canvas canvas').first()).toBeVisible();
    await expect(page.locator('#present-exit')).toBeVisible();
    expect(await call<string>(page, 'permalink')).toBe(before);
    await page.locator('#present-exit').focus();
    await page.keyboard.press('Shift+F');
    await expect(page.locator('#app')).toHaveAttribute('data-present', 'false');
    await expect(page.locator('#rail')).toBeVisible();
    expect(await call<string>(page, 'permalink')).toBe(before);
});

test('narrow viewport keeps controls and graph reachable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const errors = await boot(page, '?shot=basic-turn');
    await expect(page.locator('#canvas canvas').first()).toBeVisible();
    await expect(page.locator('#prompt-submit')).toBeInViewport();
    await expect(page.locator('#prompt-submit')).toHaveCSS('min-height', '44px');
    await expect(page.locator('#prompt-cancel')).toHaveCSS('min-height', '44px');
    await page.click('#menu-button');
    await expect(page.locator('#rail')).toBeVisible();
    await openPanel(page);
    await expect(page.locator('#view-switch')).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(page.locator('#drawer')).toBeHidden();
    await expect(page.locator('[data-drawer="views"]')).toBeFocused();
    const stage = await page.locator('#stage').evaluate((node) => node.getBoundingClientRect().width);
    expect(stage / 375).toBeGreaterThanOrEqual(0.7);
    expect(errors).toEqual([]);
});
