import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { boot } from './boot';

const motionBoot = async (page: Page, reduced: boolean): Promise<void> => {
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page);
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
        await motionBoot(page, false);
        expect(await page.evaluate(() => (window as any).__pi.activity().length)).toBeGreaterThan(0);
        const pulse = await pulseFor(page);
        expect(pulse).toContain('pi-pulse-');

        await motionBoot(page, true);
        expect(await pulseFor(page)).toMatch(/^none/);
    });

    test('with/without comparison records both variants', async ({ page }) => {
        const out = resolve('../../docs/screenshots/motion');
        const reports = resolve('../../docs/screenshots/reports');
        mkdirSync(out, { recursive: true });
        mkdirSync(reports, { recursive: true });
        const frames: Buffer[] = [];
        const pulses: string[] = [];
        const states: { settled: boolean; center: unknown; zoom: number }[] = [];

        for (const reduced of [false, true]) {
            await motionBoot(page, reduced);
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

        writeFileSync(resolve(out, 'with.png'), frames[0]!);
        writeFileSync(resolve(out, 'without.png'), frames[1]!);
        writeFileSync(
            resolve(reports, 'motion-comparison.json'),
            `${JSON.stringify(
                {
                    demand: 'TODO4.md demand record 2026-11-22',
                    variants: { motion: pulses[0], reducedMotion: pulses[1] },
                    states,
                    note: 'The pulse is a one-shot state change. Framing differs because the camera fits at startup and on material aspect changes; pixel identity and viewport parity are not gates during active development.',
                },
                null,
                2,
            )}\n`,
        );
    });
});
