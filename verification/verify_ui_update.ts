import { chromium, expect } from '@playwright/test';
import { spawn } from 'child_process';
import * as fs from 'fs';

async function main() {
    console.log('Starting dev server for UI Verification...');
    const viteProcess = spawn('npx', ['vite', '--port', '5175'], { stdio: 'pipe' });

    // Wait for the server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
        console.log('Launching playwright...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        await page.goto('http://localhost:5175/examples/fully-featured-app.html');
        await page.waitForTimeout(4000); // let spacegraph load

        // Take initial screenshot to see what's rendering
        await page.screenshot({ path: 'verification/debug_ui.png' });

        // Verify the mode buttons exist
        const viewBtn = page.getByRole('button', { name: 'View', exact: true });
        const selectBtn = page.getByRole('button', { name: 'Select', exact: true });
        const connectBtn = page.getByRole('button', { name: 'Connect', exact: true });

        await expect(viewBtn).toBeVisible();
        await expect(selectBtn).toBeVisible();
        await expect(connectBtn).toBeVisible();

        // Verify the zoom slider exists
        const zoomSlider = page.locator('input[type="range"]');
        await expect(zoomSlider).toBeVisible();

        console.log('Taking screenshot...');
        await page.screenshot({ path: 'verification/ui_updates.png' });

        await browser.close();
        console.log('UI Verification Success!');
    } catch (e) {
        console.error(e);
    } finally {
        viteProcess.kill();
        process.exit(0);
    }
}

main();