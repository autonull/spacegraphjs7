import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT =
    process.env.SG_PI_SHOTS ??
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/screenshots');
mkdirSync(OUT, { recursive: true });

const boot = async (page: Page, query = ''): Promise<string[]> => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/${query}`);
    await page.waitForFunction(() => (window as any).__pi?.ready === true);
    await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(600);
    return errors;
};

const capture = async (page: Page, name: string): Promise<void> => {
    await page.mouse.move(800, 500);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: resolve(OUT, name) });
};

test.describe('Pi flagship screenshots', () => {
    test('captures the agent cockpit and the proof catalog', async ({ page }) => {
        const errors = await boot(page);

        await page.evaluate(() => (window as any).__pi.run('stream'));
        await expect(page.locator('#evidence li').first()).toBeVisible();
        await page.locator('.spine-expand').first().click();
        await capture(page, 'pi-agent-in-action.png');

        await page.evaluate(() => {
            const aside = document.querySelector('aside')!;
            aside.scrollTop = document.querySelector<HTMLElement>('#catalog')!.offsetTop - 20;
        });
        await page.locator('#catalog details details').first().locator('summary').click();
        await capture(page, 'pi-agent-catalog.png');
        expect(errors).toEqual([]);
    });

    test('captures a launched preset with provenance', async ({ page }) => {
        const errors = await boot(page, '?preset=quiet');
        await page.locator('#policy-section summary').click();
        await capture(page, 'pi-agent-preset.png');
        const source = await page.evaluate(
            () => (window as any).__pi.policy().provenance['camera.verbMs'],
        );
        expect(source).toBe('preset');
        expect(errors).toEqual([]);
    });
});
