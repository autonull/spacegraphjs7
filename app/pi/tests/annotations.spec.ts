import { expect, test, type Page } from '@playwright/test';

type PinnedNote = { id: string; target: string; body: string };
type PiHooks = {
    loadFixture: () => number;
    pinNote: (target: string, body: string) => PinnedNote | undefined;
    notes: () => PinnedNote[];
    removeNote: (id: string) => void;
    permalink: () => string;
    applyPermalink: (hash: string) => boolean;
    report: () => string;
};

const boot = async (page: Page): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(
        () => (window as unknown as { __pi?: { ready?: boolean } }).__pi?.ready,
    );
    await page.evaluate(() => (window as unknown as { __pi: PiHooks }).__pi.loadFixture());
    await page.locator('#rail-share > summary').click();
    return errors;
};

test.describe('reviewer notes and shareable report', () => {
    test('pins notes through the widget layer and round-trips them in the permalink', async ({
        page,
    }) => {
        const errors = await boot(page);
        const target = await page
            .locator('#transcript-list [data-node]')
            .first()
            .getAttribute('data-node');
        expect(target).toBeTruthy();

        await page.locator(`#transcript-list [data-node="${target}"]`).click();
        await page.locator('#annotation-input').fill('check the provenance');
        await page.locator('#annotation-add').click();

        const notes = await page.evaluate(() =>
            (window as unknown as { __pi: PiHooks }).__pi.notes(),
        );
        expect(notes).toHaveLength(1);
        expect(notes[0]).toMatchObject({ target, body: 'check the provenance' });
        await expect(
            page.locator(`#annotation-list [data-annotation-for="${target}"]`),
        ).toContainText('check the provenance');
        await expect(page.locator('#annotation-input')).toHaveValue('');

        const hash = await page.evaluate(() =>
            (window as unknown as { __pi: PiHooks }).__pi.permalink(),
        );
        expect(hash).toContain('check%20the%20provenance');
        await page.evaluate(
            (id) => (window as unknown as { __pi: PiHooks }).__pi.removeNote(id),
            notes[0]!.id,
        );
        expect(
            await page.evaluate(() => (window as unknown as { __pi: PiHooks }).__pi.notes()),
        ).toEqual([]);
        expect(
            await page.evaluate(
                (value) => (window as unknown as { __pi: PiHooks }).__pi.applyPermalink(value),
                hash,
            ),
        ).toBe(true);
        expect(
            await page.evaluate(() => (window as unknown as { __pi: PiHooks }).__pi.notes()),
        ).toEqual(notes);
        expect(errors).toEqual([]);
    });

    test('builds a self-contained audit report from exports and notes', async ({ page }) => {
        const errors = await boot(page);
        const target = await page
            .locator('#transcript-list [data-node]')
            .first()
            .getAttribute('data-node');
        await page.evaluate(
            (id) => (window as unknown as { __pi: PiHooks }).__pi.pinNote(id!, 'review note'),
            target,
        );

        const report = await page.evaluate(() =>
            (window as unknown as { __pi: PiHooks }).__pi.report(),
        );
        expect(report).toContain('<!doctype html>');
        expect(report).toContain('<svg');
        expect(report).toContain('review note');
        expect(report).toContain('full-state permalink');
        expect(report).toContain('#s=');

        const download = page.waitForEvent('download');
        await page.locator('#report-download').click();
        expect((await download).suggestedFilename()).toMatch(/^pi-report-\d+\.html$/);
        expect(errors).toEqual([]);
    });
});
