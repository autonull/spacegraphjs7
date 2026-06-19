import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPECTED_ERROR_PATTERNS = ['WebSocket connection', 'ERR_CONNECTION_REFUSED'];

function isExpectedError(msg: string): boolean {
    return EXPECTED_ERROR_PATTERNS.some((pattern) => msg.includes(pattern));
}

const demoDir = path.join(__dirname, '../../demo');
const htmlDemos = fs
    .readdirSync(demoDir)
    .filter((f: string) => f.endsWith('.html') && !f.includes('index'))
    .map((f: string) => f.replace('.html', ''));

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

            await page.goto(`http://localhost:5173/demo/${demo}.html`);
            await page.waitForTimeout(3000);

            if (errors.length > 0) {
                console.error(`Console errors detected in ${demo}:\n`, errors.join('\n'));
            }
            expect(errors).toEqual([]);
        });
    });
});
