import { expect, type Page } from '@playwright/test';

/** One deterministic boot: ready hooks, a populated kernel and a mounted shell before assertions. */
export const boot = async (page: Page, query = ''): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/${query}`);
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.ops()), { timeout: 10_000 })
        .toBeGreaterThan(0);
    await expect
        .poll(() => page.evaluate(() => (window as any).__pi.portalNodes().length), {
            timeout: 10_000,
        })
        .toBeGreaterThan(0);
    return errors;
};

/** Wait for a frame-driven value to settle instead of sleeping for a fixed duration. */
export const frames = (page: Page, count = 10): Promise<void> =>
    page.evaluate(
        (frames) =>
            new Promise<void>((done) => {
                let seen = 0;
                const step = (): void => {
                    if (++seen >= frames) done();
                    else requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            }),
        count,
    );
