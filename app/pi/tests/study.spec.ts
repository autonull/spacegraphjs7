import { expect, test, type Page } from '@playwright/test';

const frameLayout = (page: Page) =>
    page.evaluate(() => {
        const win = (document.getElementById('app') as HTMLIFrameElement).contentWindow as
            | (Window & { __pi?: { graphLayout(): string } })
            | null;
        return win?.__pi?.graphLayout();
    });

const bootStudy = async (page: Page, query = ''): Promise<void> => {
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
};

const startTrial = async (page: Page): Promise<void> => {
    await page.locator('#participant').fill('1');
    await page.locator('#practice-done').click();
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
};

for (const [query, mode] of [
    ['', 'freeform'],
    ['?studyGraphLayout=timeline', 'timeline'],
    ['?studyGraphLayout=timeline-rows', 'timeline-rows'],
] as const) {
    test(`study pilot applies ${mode} without changing the protocol`, async ({ page }) => {
        await bootStudy(page, query);
        await startTrial(page);
        await expect.poll(() => frameLayout(page)).toBe(mode);
        await expect(page.locator('#status')).toContainText(`graph view ${mode}`);
        await expect(page.locator('#question')).toContainText(mode.toUpperCase());
    });
}

test('the untimed practice gates trial timing and stays out of trial metrics', async ({ page }) => {
    await bootStudy(page);
    await expect(page.locator('#start')).toBeDisabled();
    await expect(page.locator('#control-card li')).toHaveCount(5);
    await expect(page.locator('#control-card')).toContainText('Pan');
    await expect(page.locator('#control-card')).toContainText('Trace');
    await expect(page.locator('#question')).toContainText('Complete the untimed practice');
    expect(await page.evaluate(() => '__study' in window)).toBe(false);

    await page.locator('#practice-done').click();
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page.locator('#status')).toContainText('Practice complete');
    expect(await page.evaluate(() => '__study' in window)).toBe(false);

    await page.locator('#start').click();
    await expect(page.locator('#question')).toContainText('1/5');
    await expect(page.locator('#progress')).toHaveText('Trial 1 of 5');
    for (let trial = 0; trial < 5; trial += 1) await page.locator('#submit').click();
    const study = await page.evaluate(() => (window as any).__study);
    expect(study.trials).toHaveLength(5);
    expect(study.practiceCompleted).toBe(true);
    await expect(page.locator('#progress')).toHaveText('Complete · 5 of 5');
    await expect(page.locator('#copy-report')).toBeEnabled();
    expect(await page.locator('#report').textContent()).toBe(study.report);
});

test('the finished report can be copied without editing the captured text', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await bootStudy(page);
    await startTrial(page);
    for (let trial = 0; trial < 5; trial += 1) await page.locator('#submit').click();
    await page.locator('#copy-report').click();
    await expect(page.locator('#status')).toContainText('copied');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(await page.locator('#report').textContent());
});
