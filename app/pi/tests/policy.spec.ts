import { expect, test, type Page } from '@playwright/test';

const boot = async (page: Page): Promise<void> => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
};

test.describe('the live policy spine', () => {
    test('exposes every knob and applies changes hot without a remount', async ({ page }) => {
        await boot(page);
        await page.locator('#policy-section summary').click();
        await expect(page.locator('[data-policy-knob]')).toHaveCount(
            await page.evaluate(() => Object.keys((window as any).__pi.policy().values).length),
        );

        await page.evaluate(() => {
            (window as any).__changes = [];
            (window as any).__pi.onPolicyChange((event: unknown) => (window as any).__changes.push(event));
            (window as any).__pi.setKnob('guardrails.window', 7);
            (window as any).__pi.setKnob('navigation.minimap', false);
            (window as any).__pi.setKnob('surface.mode', 'map');
        });

        expect(await page.evaluate(() => (window as any).__pi.windowSize())).toBe(7);
        expect(await page.evaluate(() => (window as any).__pi.policy().provenance['guardrails.window'])).toBe('panel');
        await expect(page.locator('#minimap')).toBeHidden();
        await expect(page.locator('#surface')).toHaveAttribute('data-surface', 'map');
        const changes = await page.evaluate(() => (window as any).__changes);
        expect(changes.map((change: { id: string }) => change.id)).toEqual([
            'guardrails.window',
            'navigation.minimap',
            'surface.mode',
        ]);
    });

    test('carries the policy vector and fixture in a permalink v2', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            (window as any).__pi.setKnob('camera.verbMs', 250);
            (window as any).__pi.setKnob('theme.variant', 'light');
        });
        const hash = await page.evaluate(() => (window as any).__pi.permalink());
        const parsed = JSON.parse(decodeURIComponent(hash.slice(3)));
        expect(parsed.fixture).toBe('pi:local');
        expect(parsed.policy.startsWith('p1.')).toBe(true);

        await page.evaluate((value) => (window as any).__pi.applyPermalink(value), hash);
        expect(await page.evaluate(() => (window as any).__pi.policy().values['camera.verbMs'])).toBe(250);
        expect(await page.evaluate(() => (window as any).__pi.policy().provenance['theme.variant'])).toBe('url');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test('records neutral events with the policy snapshot that produced them', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => {
            (window as any).__pi.setKnob('camera.verbMs', 400);
            (window as any).__pi.recordEvent('reveal', { target: 'pi:local:read-auth' });
        });
        const session = await page.evaluate(() => (window as any).__pi.recording());
        expect(session.fixture).toBe('pi:local');
        expect(session.events.at(-1).kind).toBe('reveal');
        expect(session.events.at(-1).policy['camera.verbMs']).toBe(400);
    });
});
