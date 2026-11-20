import { expect, test, type Page } from '@playwright/test';

// The local kernel-op feed replaces the provider: no test reaches a model. The page loads from
// app/pi's own Vite, which proxies /events and /prompt to the Node op server.
const boot = async (page: Page): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text());
    });
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#status')).not.toHaveText('connecting…');
    return errors;
};

const noErrors = (errors: string[]) => expect(errors).toEqual([]);

test.describe('the Pi reference app', () => {
    test('mounts the renderer and lists every capability', async ({ page }) => {
        const errors = await boot(page);

        await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
        const ids = await page.evaluate(() => (window as any).__pi.capabilities());
        await expect(page.locator('#gallery button')).toHaveCount(ids.length);
        expect(ids).toContain('failures');
        expect(await page.evaluate(() => (window as any).__pi.ops())).toBeGreaterThan(0);
        await expect(page.locator('#status')).toContainText('nodes');

        noErrors(errors);
    });

    test('runs every capability through the gallery and the test hook', async ({ page }) => {
        const errors = await boot(page);

        for (const id of await page.evaluate(() => (window as any).__pi.capabilities())) {
            await page.locator(`[data-capability="${id}"]`).click();
            const evidence = await page.evaluate(() => (window as any).__pi.evidence());
            expect(evidence.length, id).toBeGreaterThan(0);
            expect(evidence.every((line: string) => line.trim().length > 0), id).toBe(true);
            await expect(page.locator('#evidence li').first()).toBeVisible();
        }

        noErrors(errors);
    });

    test('follows the newest node and reports attention from the local stream', async ({ page }) => {
        const errors = await boot(page);

        await page.locator('#follow-mode').selectOption('node');
        expect(await page.evaluate(() => (window as any).__pi.follow())).toBe('node');
        expect(await page.evaluate(() => (window as any).__pi.setFollow('off'))).toBe('off');
        await expect(page.locator('#follow-mode')).toHaveValue('off');

        await page.evaluate(() => (window as any).__pi.setFollow('node+focus'));
        await expect(page.locator('#follow-state')).toHaveText('node+focus');

        // The local feed replays the same ops, so no new node arrives and the camera stays put.
        await page.locator('#prompt-input').fill('Follow the local feed');
        const accepted = page.waitForResponse(
            (response) => response.url().includes('/prompt') && response.request().method() === 'POST',
        );
        await page.locator('#prompt-form button[type="submit"]').click();
        expect((await accepted).status()).toBe(202);
        expect(await page.evaluate(() => (window as any).__pi.followFrame())).toBeNull();

        const attention = await page.evaluate(() => (window as any).__pi.attention());
        expect(attention.failures).toBeGreaterThanOrEqual(0);
        await expect(page.locator('#attention')).toContainText('file(s)');

        noErrors(errors);
    });

    test('boots a recursive freeform graph in 3D with a settled simulation', async ({ page }) => {
        const errors = await boot(page);

        expect(await page.evaluate(() => (window as any).__pi.depth())).toBe('orbit');
        expect(await page.evaluate(() => (window as any).__pi.scopes().length)).toBeGreaterThan(1);
        await expect
            .poll(() => page.evaluate(() => (window as any).__pi.simulation().settled), { timeout: 10_000 })
            .toBe(true);
        const simulation = await page.evaluate(() => (window as any).__pi.simulation());
        expect(simulation.energy).toBeLessThan(0.001);
        expect(typeof simulation.steps).toBe('number');
        expect(await page.evaluate(() => (window as any).__pi.motion().verbs)).toEqual(
            expect.arrayContaining(['flyTo', 'trace']),
        );
        expect(errors).toEqual([]);
    });

    test('gates depth modes through renderer capabilities', async ({ page }) => {
        const errors = await boot(page);

        for (const mode of ['flat', 'layered', 'depth-stack', 'orbit']) {
            expect(await page.evaluate((value) => (window as any).__pi.setDepth(value), mode)).toBe(mode);
            await expect(page.locator('#depth-mode')).toHaveValue(mode);
        }
        expect(await page.evaluate(() => (window as any).__pi.setDepth('unsupported'))).toBe('orbit');
        expect(errors).toEqual([]);
    });

    test('keeps the transcript mounted across hybrid arrangements and permalinks', async ({ page }) => {
        const errors = await boot(page);

        const rows = page.locator('#transcript-list .transcript-row');
        expect(await rows.count()).toBeGreaterThan(0);
        const transcript = page.locator('#transcript');
        await expect(transcript).toBeVisible();

        await page.evaluate(() => (window as any).__pi.setArrangement('stacked'));
        await expect(page.locator('#surface')).toHaveAttribute('data-arrangement', 'stacked');
        await expect(transcript).toBeVisible();
        await page.evaluate(() => (window as any).__pi.setArrangement('floating'));
        await expect(transcript).toBeVisible();

        await page.evaluate(() => (window as any).__pi.setSurface('map'));
        await expect(transcript).toBeHidden();
        await expect(page.locator('#canvas canvas').first()).toBeVisible();
        await page.evaluate(() => (window as any).__pi.setSurface('hybrid'));
        await expect(transcript).toBeVisible();

        const id = await rows.first().getAttribute('data-node');
        await rows.first().click();
        expect(await page.evaluate(() => (window as any).__pi.revealed())).toBe(id);
        expect(page.url()).toContain(`#graph:${id}`);
        await expect(rows.first()).toHaveAttribute('data-revealed', 'true');
        expect(errors).toEqual([]);
    });

    test('exposes the five questions and new surfaces in the gallery', async ({ page }) => {
        const errors = await boot(page);
        const ids = await page.evaluate(() => (window as any).__pi.capabilities());
        for (const id of ['freeform-layout', 'scopes', 'levels', 'depth', 'motion', 'five-questions']) {
            expect(ids, id).toContain(id);
        }
        for (const id of ids.filter((entry: string) => entry.startsWith('question-'))) {
            const evidence = await page.evaluate((value) => (window as any).__pi.run(value), id);
            expect(evidence.length, id).toBeGreaterThan(0);
        }
        expect(errors).toEqual([]);
    });

    test('submits the prompt form against the local op server', async ({ page }) => {
        const errors = await boot(page);
        const before = await page.evaluate(() => (window as any).__pi.ops());

        await page.locator('#prompt-input').fill('Summarise the repo');
        await page.locator('#prompt-mode').selectOption('steer');
        const accepted = page.waitForResponse(
            (response) => response.url().includes('/prompt') && response.request().method() === 'POST',
        );
        await page.locator('#prompt-form button[type="submit"]').click();
        expect((await accepted).status()).toBe(202);

        await expect(page.locator('#prompt-input')).toHaveValue('');
        expect(await page.evaluate(() => (window as any).__pi.ops())).toBeGreaterThanOrEqual(before);

        noErrors(errors);
    });
});
