import { expect, test } from '@playwright/test';
import { DEMOS, demoPath } from '../../app/demo/src/registry.js';

const EXPECTED_ERROR_PATTERNS = ['WebSocket connection', 'ERR_CONNECTION_REFUSED'];

function isExpectedError(msg: string): boolean {
    return EXPECTED_ERROR_PATTERNS.some((pattern) => msg.includes(pattern));
}

const htmlDemos = DEMOS.filter((entry) => entry.kind === 'html').map((entry) => entry.id);

test.describe('Demo Console Error Detection', () => {
    htmlDemos.forEach((demo) => {
        test(`HTML demo: ${demo} - should have no console errors`, async ({ page }) => {
            const errors: string[] = [];

            page.on('console', (msg) => {
                if (msg.type() === 'error' && !isExpectedError(msg.text())) {
                    errors.push(msg.text());
                }
            });

            page.on('pageerror', (error) => {
                if (!isExpectedError(error.message)) {
                    errors.push(error.message);
                }
            });

            await page.goto(demoPath(demo));
            await page.waitForTimeout(3000);

            if (errors.length > 0) {
                console.error(`Console errors detected in ${demo}:\n`, errors.join('\n'));
            }
            expect(errors).toEqual([]);
        });
    });
});
