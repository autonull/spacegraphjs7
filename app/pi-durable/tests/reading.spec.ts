import { expect, test } from '@playwright/test';
import { boot, call, openPanel } from './boot';

test('transcript is a vector console over the same committed facts', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    await expect(page.locator('#reader')).toBeHidden();
    await expect(page.locator('#canvas')).toBeVisible();

    const lines = page.locator('#canvas [data-node-id]');
    expect(await lines.count()).toBeGreaterThan(8);
    await expect(lines.first()).toHaveAttribute('data-node-id', /^d:1:/);
    await expect(page.locator('#canvas .sg-terminal-line').first()).toBeVisible();
    expect(await call<string>(page, 'consoleText')).toContain('Capital of France?');

    await lines.first().click();
    expect(await call<string>(page, 'viewName')).toBe('transcript');
    await expect(page.locator('#announcer')).toContainText('Revealed');
    expect(errors).toEqual([]);
});

test('console lines are keyboard navigable', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const lines = page.locator('#canvas [data-node-id]');
    await lines.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(lines.nth(1)).toBeFocused();
    await expect(page.locator('#announcer')).toContainText('Line 2 of');
    expect(errors).toEqual([]);
});

test('scene prompt submits inside the console without stealing shortcuts', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const field = page.locator('#canvas [data-terminal-prompt]');
    await expect(field).toBeVisible();
    await field.fill('hello from the console');
    await field.press('Enter');
    await expect(page.locator('#announcer')).toContainText(/Local answer|Prompt/);
    expect(await call<string>(page, 'viewName')).toBe('transcript');
    expect(errors).toEqual([]);
});

test('clicking a line toggles detail in inline, popup and rail modes', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const line = page.locator('#canvas [data-node-id]').nth(1);
    await line.click();
    await expect(page.locator('#canvas [data-node-id^="detail-"]').first()).toBeVisible();
    expect(await call<string | undefined>(page, 'consoleExpanded')).toBeTruthy();
    await call(page, 'setConsoleDetailMode', 'popup');
    await expect(page.locator('.terminal-detail-popup').first()).toBeVisible();
    await call(page, 'setConsoleDetailMode', 'rail');
    await expect(page.locator('.terminal-detail-rail').first()).toBeVisible();
    await page.locator('#canvas [data-node-id]').nth(1).click();
    await expect(page.locator('#canvas [data-node-id^="detail-"]')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('console compares two tabs over one kernel', async ({ page }) => {
    const errors = await boot(page, '?shot=fork-tabs');
    await call(page, 'setView', 'transcript');
    const active = await call<string>(page, 'activeTab');
    const peer = (await call<string[]>(page, 'sessions')).find((id) => id !== active);
    expect(peer).toBeTruthy();
    const diff = await call<{ added: string[]; removed: string[]; changed: string[] }>(
        page,
        'consoleCompare',
        peer,
    );
    expect(diff).toBeDefined();
    expect(Array.isArray(diff!.added)).toBe(true);
    expect(errors).toEqual([]);
});

test('console exposes chapters and replay steps over committed lines', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const chapters = await call<{ id: string; startID: string }[]>(page, 'consoleChapters');
    expect(chapters.length).toBeGreaterThan(0);
    expect(chapters[0]?.id).toBe('chapter-1');
    const steps = await call<number>(page, 'consoleReplaySteps');
    expect(steps).toBe(await page.locator('#canvas .sg-terminal-line').count());
    expect(errors).toEqual([]);
});

test('wheel pan releases tail follow and the badge restores it', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const badge = page.locator('#follow-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('tail: follow');
    await page.locator('#canvas').hover();
    await page.mouse.wheel(0, 200);
    await expect(badge).toContainText('free');
    await badge.click();
    await expect(badge).toHaveText('tail: follow');
    expect(errors).toEqual([]);
});

test('palette selection changes console glyphs', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    expect((await call<{ id: string }[]>(page, 'consolePalettes')).map((entry) => entry.id)).toContain(
        'retro',
    );
    await call(page, 'setConsolePalette', 'retro');
    await expect(page.locator('#canvas .tg-gutter').first()).toContainText('v');
    expect(errors).toEqual([]);
});

test('gutter slots mark boundaries without changing committed lines', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    await expect(page.locator('#canvas [data-node-id^="gutter-"]').first()).toBeVisible();
    expect(errors).toEqual([]);
});

test('console selection and tail survive a compact permalink', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const ids = await page.locator('#canvas [data-node-id]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-node-id') ?? ''),
    );
    const sel = `${ids[0]}:0~${ids[1]}:3`;
    const value = btoa(`view=transcript&sel=${sel}&tail=${ids[1]}&version=1`)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    await call(page, 'applyAddress', value);
    expect(await call<string | undefined>(page, 'consoleRange')).toBe(sel);
    await expect(page.locator(`#canvas [data-node-id="${ids[1]}"]`)).toBeFocused();
    expect(errors).toEqual([]);
});

test('Shift+Arrow extends a console range and announces the span', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const lines = page.locator('#canvas [data-node-id]');
    await lines.first().focus();
    await page.keyboard.press('Shift+ArrowDown');
    await expect(page.locator('#announcer')).toContainText('Selected 2 lines');
    expect(await call<string | undefined>(page, 'consoleRange')).toMatch(/:0~.*:0$/);
    await expect(lines.nth(1)).toBeFocused();
    expect(errors).toEqual([]);
});

test('minimap click re-engages tail follow', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const badge = page.locator('#follow-badge');
    await page.locator('#canvas').hover();
    await page.mouse.wheel(0, 200);
    await expect(badge).toContainText('free');
    await page.locator('#survey').click();
    await expect(badge).toHaveText('tail: follow');
    expect(errors).toEqual([]);
});

test('palette and detail state survive a compact permalink', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const id = await page.locator('#canvas [data-node-id]').first().getAttribute('data-node-id');
    await call(page, 'setConsolePalette', 'retro');
    await call(page, 'setConsoleDetailMode', 'popup');
    await call(page, 'toggleConsoleDetail', id);
    await expect(page.locator('.terminal-detail-popup').first()).toBeVisible();
    const before = await call<{ pal?: string; det?: string }>(page, 'address');
    expect(before.pal).toBe('retro');
    expect(before.det).toBe(`popup~${id}`);
    const compact = await call<string>(page, 'compactAddress');
    await call(page, 'applyAddress', compact.slice(compact.indexOf('at=') + 3));
    const after = await call<{ pal?: string; det?: string }>(page, 'address');
    expect(after.pal).toBe('retro');
    expect(after.det).toBe(`popup~${id}`);
    await expect(page.locator('#canvas .tg-gutter').first()).toContainText('v');
    expect(errors).toEqual([]);
});

test('exports a selected console range as Markdown and JSON', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const ids = await page.locator('#canvas [data-node-id]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-node-id') ?? ''),
    );
    const sel = `${ids[0]}:0~${ids[1]}:0`;
    const value = btoa(`view=transcript&sel=${sel}&version=1`)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    await call(page, 'applyAddress', value);
    const markdown = await call<string>(page, 'exportConsole', 'markdown');
    expect(markdown).toContain(`\`${ids[0]}\``);
    expect(markdown).toContain(`\`${ids[1]}\``);
    const json = await call<string>(page, 'exportConsole', 'json');
    expect(JSON.parse(json).map((entry: { id: string }) => entry.id)).toEqual([ids[0], ids[1]]);
    expect(errors).toEqual([]);
});

test('documents render as a readable document with graph backlinks', async ({ page }) => {
    const errors = await boot(page, '?shot=docs');
    await expect(page.locator('#reader')).toBeVisible();
    await expect(page.locator('#reader')).toHaveAttribute('aria-label', 'Documents');
    await expect(page.locator('#reader')).toContainText('Host todos');
    const sections = page.locator('#reader .reading-section');
    expect(await sections.count()).toBeGreaterThan(0);
    await expect(page.locator('#reader .reading-backlink')).toHaveCount(await sections.count());
    expect(errors).toEqual([]);
});

test('reveal focuses a line in the console instead of the hidden reader', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const line = page.locator('#canvas [data-node-id]').nth(2);
    const id = await line.getAttribute('data-node-id');
    await call(page, 'reveal', id);
    await expect(line).toBeFocused();
    expect(errors).toEqual([]);
});

test('the inspector links a graph fact back to its console line', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await call(page, 'setView', 'transcript');
    const id = await page.locator('#canvas [data-node-id]').first().getAttribute('data-node-id');
    await call(page, 'setView', 'graph');
    await call(page, 'reveal', id);
    await openPanel(page, 'inspector');
    await expect(page.locator('#read-in-transcript')).toBeVisible();
    await page.click('#read-in-transcript');
    await expect(page.locator('#reader')).toBeHidden();
    await expect(page.locator(`#canvas [data-node-id="${id}"]`)).toBeFocused();
    expect(errors).toEqual([]);
});
