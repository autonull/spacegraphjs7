import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotDir = path.join(__dirname, '../../screenshots');

if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

const EXPECTED_ERROR_PATTERNS = ['WebSocket connection', 'ERR_CONNECTION_REFUSED'];

function isExpectedError(msg: string): boolean {
    return EXPECTED_ERROR_PATTERNS.some((pattern) => msg.includes(pattern));
}

const demoDir = path.join(__dirname, '../../demo');
const htmlDemos = fs
    .readdirSync(demoDir)
    .filter((f: string) => f.endsWith('.html') && !f.includes('index') && !f.includes('n8n'))
    .map((f: string) => f.replace('.html', ''));

test.describe('Demo Screenshots & Rendering Verification', () => {
    htmlDemos.forEach((demo) => {
        test(`screenshot: ${demo} - renders and has content`, async ({ page }) => {
            const errors: string[] = [];

            page.on('console', (msg) => {
                if (msg.type() === 'error' && !isExpectedError(msg.text())) {
                    errors.push(`[CONSOLE] ${msg.text()}`);
                }
            });
            page.on('pageerror', (error) => {
                if (!isExpectedError(error.message)) {
                    errors.push(`[PAGE ERROR] ${error.message}`);
                }
            });

            await page.goto(`http://localhost:5173/demo/${demo}.html`, {
                waitUntil: 'networkidle',
                timeout: 15000,
            });

            await page.waitForTimeout(3000);

            expect(errors).toEqual([]);

            const screenshotPath = path.join(screenshotDir, `verified-${demo}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });

            expect(fs.existsSync(screenshotPath)).toBe(true);

            const stats = fs.statSync(screenshotPath);
            const sizeKB = stats.size / 1024;
            console.log(`[${demo}] screenshot: ${sizeKB.toFixed(1)}KB`);

            expect(sizeKB).toBeGreaterThan(15);
        });
    });
});
