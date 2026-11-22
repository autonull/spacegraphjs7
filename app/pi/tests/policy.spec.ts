import { expect, test } from '@playwright/test';
import { boot } from './boot';

test.describe('the live policy spine', () => {
    test('exposes every knob and applies changes hot without a remount', async ({ page }) => {
        await boot(page);
        await page.locator('#policy-section > summary').click();
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

    test('samples an experiment and assigns a cell through the experiment layer', async ({ page }) => {
        await boot(page);
        const sampled = await page.evaluate(() => {
            const pi = (window as any).__pi;
            const result = pi.sampleExperiment('bands-x-surface');
            pi.assignExperiment(result.cells[0]);
            return {
                total: result.matrix.total,
                cells: result.cells.length,
                provenance: pi.policy().provenance['bands.overviewMax'],
                events: pi.recording().events.map((event: any) => event.kind),
            };
        });
        expect(sampled.total).toBe(12);
        expect(sampled.cells).toBe(8);
        expect(sampled.provenance).toBe('experiment');
        expect(sampled.events).toContain('experiment:exposure');
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
        expect(session.events.at(-1).meta.legibility).toBeGreaterThan(0);

        const replay = await page.evaluate(() => (window as any).__pi.replayRecording());
        expect(replay.success).toBeGreaterThanOrEqual(0);
        const comparison = await page.evaluate(() =>
            (window as any).__pi.counterfactual({
                ...(window as any).__pi.policy().values,
                'camera.verbMs': 100,
            }),
        );
        expect(comparison.successDelta).toBe(0);
    });

    test('re-simulates geometry under a variant during offline measurement', async ({ page }) => {
        await boot(page);
        await page.evaluate(() => (window as any).__pi.recordEvent('reveal'));
        const measured = await page.evaluate(() =>
            (window as any).__pi.measureExperiment('geometry-x-depth'),
        );
        expect(measured.cells.length).toBeGreaterThan(0);
        expect(measured.incumbent.legibility).toBeGreaterThan(0);
        const simulated = await page.evaluate(() => (window as any).__pi.replaySimulated());
        expect(simulated.legibility).toBe(measured.incumbent.legibility);
    });
});
