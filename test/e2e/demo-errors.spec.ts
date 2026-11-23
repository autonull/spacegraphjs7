import { expect, test } from '@playwright/test';
import { demoPath } from '../../app/demo/src/registry.js';
import { EXPECTED_ERRORS, htmlDemoIds, isExpectedError } from './atlas-kit.js';

test.describe('Demo Console Error Detection', () => {
    htmlDemoIds.forEach((demo) => {
        test(`HTML demo: ${demo} - should have no console errors`, async ({ page }) => {
            const errors: string[] = [];

            page.on('console', (msg) => {
                if (msg.type() === 'error' && !isExpectedError(msg.text(), EXPECTED_ERRORS.basic)) {
                    errors.push(msg.text());
                }
            });

            page.on('pageerror', (error) => {
                if (!isExpectedError(error.message, EXPECTED_ERRORS.basic)) {
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
