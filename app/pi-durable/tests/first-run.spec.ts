import { expect, test } from '@playwright/test';
import { boot, call } from './boot';

test('nine-step first run works offline', async ({ page }) => {
    const errors = await boot(page, '?shot=basic-turn');
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
    expect(call(page, 'applyPermalink', link)).resolves.toBe(true);
    await page.keyboard.press('g');
    await expect(page.locator('#tasks')).not.toHaveAttribute('data-active', '');
    await page.keyboard.press('?');
    await expect(page.locator('#help')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#help')).toBeHidden();

    const vision = await call<{ score: number }>(page, 'vision');
    expect(vision.score).toBeGreaterThan(0.5);
    expect(errors).toEqual([]);
});

test('a seeded prompt and a retried request id produce one answer', async ({ page, request }) => {
    const errors = await boot(page);
    const health = await (await request.get('/api/health')).json();
    expect(health).toMatchObject({ ok: true, storage: 'jsonl', provider: 'faux' });
    const first = await (
        await request.post('/api/conversations/1/prompt', {
            data: { text: 'Capital of France?', requestId: 'resume-check-1', mode: 'steer' },
        })
    ).json();
    expect(first.status).toBe('accepted');
    const retry = await (
        await request.post('/api/conversations/1/prompt', {
            data: { text: 'Capital of France?', requestId: 'resume-check-1', mode: 'steer' },
        })
    ).json();
    expect(retry.status).toBe('duplicate');
    await expect
        .poll(async () => {
            const exported = (await (
                await request.get('/api/export?format=md&id=1')
            ).body()) as Buffer | null;
            return exported?.toString().match(/Paris\./g)?.length ?? 0;
        })
        .toBe(1);
    expect(errors).toEqual([]);
});
