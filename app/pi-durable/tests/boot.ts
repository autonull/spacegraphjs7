import { expect, type Page } from '@playwright/test';

export const boot = async (page: Page, query = ''): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/${query}`);
    await page.waitForFunction(() => (window as { __durable?: { ready?: () => boolean } }).__durable?.ready?.() === true);
    await expect
        .poll(() => call<number>(page, 'ops'), { timeout: 10_000 })
        .toBeGreaterThan(0);
    await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
    return errors;
};

export const call = async <T>(page: Page, name: string, ...args: unknown[]): Promise<T> =>
    page.evaluate(
        ({ name, args }) => {
            const api = (window as unknown as Record<string, Record<string, (...values: unknown[]) => unknown>>).__durable!;
            return api[name]!(...args) as T;
        },
        { name, args },
    );
