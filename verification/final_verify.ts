import { chromium } from 'playwright';
import { spawn } from 'child_process';
import * as fs from 'fs';

async function main() {
    console.log('Starting dev server for screenshots...');
    // We use a specific port to avoid conflicts
    const port = 5190;
    const viteProcess = spawn('npx', ['vite', '--port', port.toString(), '--config', 'vite.demo.config.ts'], {
        stdio: 'pipe'
    });

    // Capture logs for debugging if needed
    viteProcess.stdout.on('data', (data) => console.log(`[Vite] ${data}`));
    viteProcess.stderr.on('data', (data) => console.error(`[Vite Error] ${data}`));

    // Wait for the server to start
    await new Promise((resolve) => setTimeout(resolve, 8000));

    if (!fs.existsSync('verification')) {
        fs.mkdirSync('verification');
    }

    try {
        console.log('Launching playwright...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        // Monitor console logs from the page
        page.on('console', msg => {
            if (msg.type() === 'error') console.error('[PAGE ERROR]', msg.text());
        });

        const demos = [
            'html-simple-test',
            'html-test',
            'html-paradigm'
        ];

        for (const demo of demos) {
            try {
                console.log(`\nCapturing demo: ${demo}`);
                // The demo app usually takes a 'demo' query param to switch demos
                await page.goto(`http://localhost:${port}/?demo=${demo}`, {
                    waitUntil: 'networkidle',
                    timeout: 20000
                });

                // Wait for the specific renderer to initialize
                await page.waitForTimeout(4000);

                const screenshotPath = `verification/final-${demo}.png`;
                await page.screenshot({ path: screenshotPath });
                console.log(`  ✓ Captured ${screenshotPath}`);

                // Extra check: look for HTML nodes
                const nodeCount = await page.evaluate(() => {
                    return document.querySelectorAll('.spacegraph-html-node').length;
                });
                console.log(`  ✓ Found ${nodeCount} HTML nodes in DOM`);

            } catch (e) {
                console.error(`  ✗ Failed to capture ${demo}:`, (e as Error).message);
            }
        }

        await browser.close();
        console.log('\n✓ Final verification capture complete!');
    } catch (e) {
        console.error('Verification script failed:', e);
    } finally {
        viteProcess.kill();
        console.log('Dev server stopped.');
    }
}

main();
