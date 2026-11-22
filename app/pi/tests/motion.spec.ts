import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const boot = async (page: Page, reduced: boolean): Promise<void> => {
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#status')).not.toHaveText('connecting…');
    await page.evaluate(() => (window as any).__pi.pause(true));
};

const pulseFor = (page: Page): Promise<string> =>
    page.evaluate(() => {
        const id = (window as any).__pi.activity()[0] as string | undefined;
        if (!id) return 'no-activity';
        const card = document.querySelector(`[data-node-id="${CSS.escape(id)}"]`) as HTMLElement | null;
        return `${card?.style.animationName ?? 'no-card'} ${card?.style.animationDuration ?? ''}`;
    });

const advanceFrames = async (page: Page): Promise<void> => {
    for (let i = 0; i < 6; i++) await page.evaluate(() => (window as any).__pi.advance(0.05));
    await page.evaluate(() => (window as any).__pi.settle());
};

test.describe('Pi activity pulse', () => {
    test('active cards pulse; reduced motion snaps to the final frame', async ({ page }) => {
        await boot(page, false);
        expect(await page.evaluate(() => (window as any).__pi.activity().length)).toBeGreaterThan(0);
        const pulse = await pulseFor(page);
        expect(pulse).toContain('pi-pulse-');
        expect(pulse).toContain('120ms');

        await boot(page, true);
        expect(await pulseFor(page)).toMatch(/^none/);
    });

    test('with/without comparison records both variants', async ({ page }) => {
        const out = resolve('../../docs/screenshots/motion');
        mkdirSync(out, { recursive: true });
        const frames: Buffer[] = [];
        const pulses: string[] = [];
        const states: { settled: boolean; center: unknown; zoom: number }[] = [];

        for (const reduced of [false, true]) {
            await boot(page, reduced);
            pulses.push(await pulseFor(page));
            await advanceFrames(page);
            frames.push(await page.screenshot({ animations: 'disabled' }));
            states.push(
                await page.evaluate(() => {
                    const pi = (window as any).__pi;
                    const viewport = pi.viewport();
                    return {
                        settled: pi.simulation().settled,
                        center: viewport.center,
                        zoom: viewport.zoom,
                    };
                }),
            );
        }

        for (const state of states) expect(state.settled).toBe(true);

        writeFileSync(resolve(out, 'without.png'), frames[0]!);
        writeFileSync(resolve(out, 'with.png'), frames[1]!);
        writeFileSync(
            resolve(out, 'comparison.json'),
            `${JSON.stringify(
                {
                    demand: 'TODO4.md demand record 2026-11-22',
                    variants: { motion: pulses[0], reducedMotion: pulses[1] },
                    states,
                    note: 'The pulse is a one-shot state change. Framing differs because the camera fits once at startup; pixel identity and viewport parity are not gates during active development.',
                },
                null,
                2,
            )}\n`,
        );
    });
});
