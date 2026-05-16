import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const referenceDir = path.join(__dirname, '../../test/visual-references');

if (!fs.existsSync(referenceDir)) {
    fs.mkdirSync(referenceDir, { recursive: true });
}

// Key demos to verify visually
const CRITICAL_DEMOS = [
    'quickstart',
    'layouts',
    'interaction',
    'large',
    'plugins',
    'mermaid',
    'html',
    'system-architecture',
    'performance',
    'vision-ai',
    'physics'
];

test.describe('Visual Regression Tests', () => {
    CRITICAL_DEMOS.forEach((demo) => {
        test(`visual regression: ${demo}`, async ({ page }) => {
            const url = demo.includes('-') || ['performance', 'vision-ai', 'physics', 'system-architecture'].includes(demo)
                ? `http://localhost:5173/?demo=${demo}`
                : `http://localhost:5173/${demo}.html`;

            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(5000); // Wait for animations/rendering

            // Handle the TS-based demos that use the index.html with ?demo= parameter
            if (url.includes('?demo=')) {
                await page.waitForSelector('canvas', { timeout: 10000 });
            }

            const screenshot = await page.screenshot();
            const referencePath = path.join(referenceDir, `${demo}.png`);

            if (!fs.existsSync(referencePath)) {
                // First run: save as reference
                fs.writeFileSync(referencePath, screenshot);
                console.log(`[${demo}] Saved new reference image.`);
            } else {
                // Compare against reference
                expect(screenshot).toMatchSnapshot(`${demo}.png`, {
                    maxDiffPixelRatio: 0.05,
                    threshold: 0.2
                });
            }
        });
    });
});
