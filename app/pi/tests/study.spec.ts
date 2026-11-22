import { expect, test, type Page } from '@playwright/test';

const frameLayout = (page: Page) =>
    page.evaluate(() => {
        const win = (document.getElementById('app') as HTMLIFrameElement).contentWindow as
            | (Window & { __pi?: { graphLayout(): string } })
            | null;
        return win?.__pi?.graphLayout();
    });

for (const [query, mode] of [
    ['', 'freeform'],
    ['?studyGraphLayout=timeline', 'timeline'],
    ['?studyGraphLayout=timeline-rows', 'timeline-rows'],
] as const) {
    test(`study pilot applies ${mode} without changing the protocol`, async ({ page }) => {
        await page.goto(`/study.html${query}`);
        await expect
            .poll(
                () =>
                    page.evaluate(() => {
                        const win = (document.getElementById('app') as HTMLIFrameElement).contentWindow as
                            | (Window & { __pi?: { ready?: boolean } })
                            | null;
                        return win?.__pi?.ready === true;
                    }),
                { timeout: 20_000 },
            )
            .toBe(true);

        await page.locator('#participant').fill('1');
        await page.locator('#start').click();
        await expect.poll(() => frameLayout(page)).toBe(mode);
        await expect(page.locator('#status')).toContainText(`graph view ${mode}`);
        await expect(page.locator('#question')).toContainText(mode.toUpperCase());
    });
}
