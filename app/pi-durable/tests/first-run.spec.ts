import { expect, test } from '@playwright/test';
import { boot, call, openPanel } from './boot';

test('nine-step first run works offline', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await openPanel(page);
    expect(await page.locator('#tab-strip [role="tab"]').count()).toBe(1);
    await expect(page.locator('#status-strip')).toContainText('local feed');
    await expect(page.locator('#status-strip')).toContainText('task');

    await page.fill('#prompt-input', 'Capital of France?');
    await page.click('#prompt-submit');
    await expect(page.locator('#announcer')).toContainText('Local answer');
    expect(await call<number>(page, 'ops')).toBeGreaterThan(0);

    await page.click('#view-switch [data-view="tasks"]');
    await expect(page.locator('#tasks')).toHaveAttribute('data-active', '');
    await page.click('#approve-button');
    await expect(page.locator('#announcer')).toContainText('Approved');

    await page.click('#fork-button');
    expect(await call<string[]>(page, 'sessions')).toHaveLength(2);
    await page.keyboard.press('BracketLeft');
    expect(await call<string>(page, 'activeTab')).toBe('1');
    await page.keyboard.press('BracketRight');
    expect(await call<string>(page, 'activeTab')).not.toBe('1');

    const link = await call<string>(page, 'permalink');
    await expect(call(page, 'applyPermalink', link)).resolves.toBe(true);
    await expect.poll(() => call<string>(page, 'viewName')).toBe('tasks');
    await page.keyboard.press('g');
    await expect.poll(() => call<string>(page, 'viewName')).toBe('timeline');
    await expect(page.locator('#tasks')).not.toHaveAttribute('data-active', '');
    await page.keyboard.press('?');
    await expect(page.locator('#help')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#help')).toBeHidden();

    const vision = await call<{ score: number }>(page, 'vision');
    expect(vision.score).toBeGreaterThan(0.5);
    expect(errors).toEqual([]);
});

test('tasks and timeline are two scoped placements of one kernel', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
    await openPanel(page);
    const graph = await call<{ view: string; nodes: number }>(page, 'layout');
    expect(graph.view).toBe('graph');
    await page.click('#view-switch [data-view="tasks"]');
    const tasks = await call<{ view: string; nodes: number }>(page, 'layout');
    expect(tasks.view).toBe('tasks');
    await expect(page.locator('#tasks')).toHaveAttribute('data-active', '');
    await page.click('#view-switch [data-view="timeline"]');
    const timeline = await call<{ view: string; nodes: number }>(page, 'layout');
    expect(timeline.view).toBe('timeline');
    expect(timeline.nodes).toBeGreaterThan(0);
    expect(tasks.nodes).toBeLessThan(graph.nodes);
    await expect(page.locator('#timeline')).toHaveAttribute('data-active', '');
    expect(errors).toEqual([]);
});

test('scenario URLs boot a named fixture without a server', async ({ page }) => {
    const errors = await boot(page, '?scenario=typed-errors');
    await expect(page.locator('#announcer')).toContainText('typed-errors');
    expect(await call<string>(page, 'viewName')).toBe('graph');
    expect(await call<number>(page, 'ops')).toBeGreaterThan(4);
    await page.goto('/?scenario=compaction');
    await page.waitForFunction(() => (window as { __durable?: { ready?: () => boolean } }).__durable?.ready?.() === true);
    expect(await call<string>(page, 'viewName')).toBe('timeline');
    expect(errors).toEqual([]);
});

test('a seeded prompt and a retried request id produce one answer', async ({ page, request }) => {
    const errors = await boot(page);
    const health = await (await request.get('/api/health')).json();
    expect(health).toMatchObject({ ok: true, storage: 'jsonl', provider: 'faux' });
    const created = await (await request.post('/api/conversations', { data: { agent: 'faux-1' } })).json();
    const id = created.id as string;
    const requestId = `resume-check-${crypto.randomUUID()}`;
    const first = await (
        await request.post(`/api/conversations/${id}/prompt`, {
            data: { text: 'Capital of France?', requestId, mode: 'steer' },
        })
    ).json();
    expect(first.status).toBe('accepted');
    const retry = await (
        await request.post(`/api/conversations/${id}/prompt`, {
            data: { text: 'Capital of France?', requestId, mode: 'steer' },
        })
    ).json();
    expect(retry.status).toBe('duplicate');
    await expect
        .poll(async () => {
            const exported = (await (
                await request.get(`/api/export?format=md&id=${id}`)
            ).body()) as Buffer | null;
            return exported?.toString().match(/Paris\./g)?.length ?? 0;
        })
        .toBe(1);
    expect(errors).toEqual([]);
});
