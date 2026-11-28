import { expect, type Page } from '@playwright/test';

export const boot = async (page: Page, query = ''): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/${query}`);
    await page.waitForFunction(() => (window as { __durable?: { ready?: () => boolean } }).__durable?.ready?.() === true);
    await expect
        .poll(() => call<number>(page, 'ops'), { timeout: 10_000 })
        .toBeGreaterThan(0);
    await expectSurface(page);
    return errors;
};

/** Boots directly into the transcript console used by the console specs. */
export const bootConsole = async (page: Page, query = '?shot=basic-turn'): Promise<string[]> => {
    const errors = await boot(page, query);
    await call(page, 'setView', 'transcript');
    return errors;
};

/** The canvas and the reader are alternate projections of the same fold. */
export const expectSurface = async (page: Page): Promise<void> => {
    const surface = await page.locator('#reader').isVisible()
        ? page.locator('#reader')
        : page.locator('#canvas canvas').first();
    await expect(surface).toBeVisible({ timeout: 10_000 });
};

/** Opens the control panel through its accessible rail icon. */
export const openPanel = async (page: Page, section = 'views'): Promise<void> => {
    await page.getByRole('button', { name: SECTION_NAMES[section] ?? section }).click();
    await expect(page.locator('#drawer')).toBeVisible();
};

const SECTION_NAMES: Readonly<Record<string, string>> = {
    views: 'Views', rung: 'Landmarks', inspector: 'Inspector',
    controls: 'Controls', legend: 'Legend', glossary: 'Glossary', insights: 'Insights',
};

export const settle = async (page: Page): Promise<void> => {
    await page.waitForFunction(() => {
        const api = (window as unknown as { __durable?: { viewport: () => { zoom: number } } }).__durable;
        if (!api?.viewport) return false;
        const state = window as unknown as { sgKey?: string; sgStable?: number };
        const key = String(api.viewport().zoom.toFixed(3));
        if (state.sgKey === key) state.sgStable = (state.sgStable ?? 0) + 1;
        else {
            state.sgKey = key;
            state.sgStable = 1;
        }
        return state.sgStable >= 3;
    }, undefined, { timeout: 8_000, polling: 120 });
};

export const call = async <T>(page: Page, name: string, ...args: unknown[]): Promise<T> =>
    page.evaluate(
        ({ name, args }) => {
            const api = (window as unknown as Record<string, Record<string, (...values: unknown[]) => unknown>>).__durable!;
            return api[name]!(...args) as T;
        },
        { name, args },
    );
