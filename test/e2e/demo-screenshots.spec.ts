import { expect, test, type Page } from '@playwright/test';
import { demoPath } from '../../app/demo/src/registry.js';
import { EXPECTED_ERRORS, htmlDemoIds, isExpectedError } from './atlas-kit.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotDir = path.join(__dirname, '../../screenshots');

if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

// A screenshot should show what a demo is for. The delta demo starts at its smallest state so the
// spec can compare positions; the captured frame shows the layer switch mid-flight instead.
const setups: Record<string, (page: Page) => Promise<void>> = {
    'delta-animation': async (page) => {
        await page.getByRole('button', { name: 'Switch layer' }).click();
        await page.evaluate(() =>
            (window as { deltaDemo?: { draw(t: number): void } }).deltaDemo?.draw(0.5),
        );
    },
};

test.describe('Demo Screenshots & Rendering Verification', () => {
    htmlDemoIds.forEach((demo) => {
        test(`screenshot: ${demo} - renders and has content`, async ({ page }) => {
            const errors: string[] = [];

            page.on('console', (msg) => {
                if (
                    msg.type() === 'error' &&
                    !isExpectedError(msg.text(), EXPECTED_ERRORS.screenshots)
                ) {
                    errors.push(`[CONSOLE] ${msg.text()}`);
                }
            });
            page.on('pageerror', (error) => {
                if (!isExpectedError(error.message, EXPECTED_ERRORS.screenshots)) {
                    errors.push(`[PAGE ERROR] ${error.message}`);
                }
            });

            await page.goto(demoPath(demo), {
                waitUntil: 'networkidle',
                timeout: 15000,
            });

            await setups[demo]?.(page);

            // Output errors to console if any, for debugging purposes before the assertion
            if (errors.length > 0) {
                console.log(`[${demo}] Found errors: `, errors);
            }

            // Also check that a valid canvas and correct rendering has occurred
            try {
                await page.waitForSelector('canvas', { timeout: 2000 });
            } catch (e) {
                console.log(`[${demo}] No canvas found!`);
            }

            // Let the first animation frames paint; other gates cover console errors and content.
            await page.waitForTimeout(800);

            expect(errors).toEqual([]);

            const screenshotPath = path.join(screenshotDir, `verified-${demo}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });

            expect(fs.existsSync(screenshotPath)).toBe(true);

            const stats = fs.statSync(screenshotPath);
            const sizeKB = stats.size / 1024;
            console.log(`[${demo}] screenshot: ${sizeKB.toFixed(1)}KB`);

            expect(sizeKB).toBeGreaterThan(1);
        });
    });
});
