import { expect, test } from '@playwright/test';
import { boot, call, openPanel } from './boot';

type Representation = { readonly nodeIDs: readonly string[]; readonly edgeKinds: readonly string[] };

test('prompt cancel reports the local and accepted outcomes', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    const announcer = page.locator('#announcer');
    await page.fill('#prompt-input', 'A local question.');
    await page.click('#prompt-submit');
    await expect(announcer).toContainText('Local answer accepted ui-local-1');
    await page.click('#prompt-cancel');
    await expect(announcer).toContainText('nothing to cancel');
    await expect(page.locator('#prompt-submit')).toHaveAttribute('data-busy', 'false');
    expect(errors).toEqual([]);
});

test('fork uses the selected entry and only recorded fork edges', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'reveal', 'd:1:entry:1-user');
    await openPanel(page, 'controls');
    await page.click('#fork-button');
    await expect(page.locator('#announcer')).toContainText('at 1-user');
    expect(await call<string[]>(page, 'sessions')).toHaveLength(2);
    const representation = await call<Representation>(page, 'representation');
    expect(representation.edgeKinds).toEqual(expect.arrayContaining(['fork', 'forkedFrom']));
    expect(representation.nodeIDs.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
});

test('inspector fork action uses the committed entry it describes', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await openPanel(page, 'inspector');
    await call(page, 'reveal', 'd:1:entry:1-answer');
    await expect(page.locator('#inspector #fork-here')).toBeVisible();
    await page.click('#inspector #fork-here');
    await expect(page.locator('#announcer')).toContainText('at 1-answer');
    expect(errors).toEqual([]);
});

test('new conversation creates an empty tab in the local feed', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await openPanel(page, 'controls');
    await page.click('#new-button');
    expect(await call<string[]>(page, 'sessions')).toHaveLength(2);
    expect(await call<string>(page, 'activeTab')).toBe('2');
    await expect(page.locator('#announcer')).toContainText('New conversation 2 in the local feed');
    expect(errors).toEqual([]);
});

test('action shortcuts reach cancel, fork and new without the mouse', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await page.keyboard.press('Shift+R');
    await expect(page.locator('#announcer')).toContainText('Forked');
    await page.keyboard.press('n');
    expect(await call<string[]>(page, 'sessions')).toHaveLength(3);
    await page.fill('#prompt-input', 'A local question.');
    await page.keyboard.press('Control+Enter');
    await expect(page.locator('#announcer')).toContainText('nothing to cancel');
    expect(errors).toEqual([]);
});

test('action hooks are typed and refuse writes in the observer', async ({ page }) => {
    const errors = await boot(page, '?observer=1');
    expect(await call<boolean>(page, 'abort')).toBe(false);
    expect(await call<boolean>(page, 'forkAt', 'd:1:entry:1-user')).toBe(false);
    expect(await call<boolean>(page, 'newConversation')).toBe(false);
    await expect(page.locator('#announcer')).toContainText('read-only');
    await expect(page.locator('#new-button')).toBeHidden();
    expect(errors).toEqual([]);
});

test('online cancel and new conversation use the owner server', async ({ page }) => {
    const errors = await boot(page);
    await page.fill('#prompt-input', 'Capital of France?');
    await page.click('#prompt-submit');
    await expect(page.locator('#announcer')).toContainText('Prompt accepted ui-');
    await page.click('#prompt-cancel');
    await expect(page.locator('#announcer')).toContainText('Cancelled ui-');
    await openPanel(page, 'controls');
    await page.click('#new-button');
    await expect(page.locator('#announcer')).toContainText('New conversation');
    const active = await call<string>(page, 'activeTab');
    expect(await call<string[]>(page, 'sessions')).toContain(active);
    expect(errors).toEqual([]);
});
