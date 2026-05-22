import { chromium } from 'playwright';
import { spawn } from 'child_process';
import * as fs from 'fs';

async function verifyDemo(demoName: string) {
    console.log(`Starting verification for ${demoName}...`);
    const port = 5200;
    const viteProcess = spawn('npx', ['vite', '--port', port.toString(), '--config', 'vite.demo.config.ts'], {
        stdio: 'pipe'
    });

    // Wait for the server to start
    await new Promise((resolve) => setTimeout(resolve, 10000));

    try {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        console.log(`Navigating to ${demoName}...`);
        await page.goto(`http://localhost:${port}/?demo=${demoName}`, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        await page.waitForTimeout(5000);

        // Capture screenshot
        const screenshotPath = `verification/verify-${demoName}.png`;
        await page.screenshot({ path: screenshotPath });
        console.log(`  ✓ Captured ${screenshotPath}`);

        // Inspect DOM
        const stats = await page.evaluate(() => {
            const nodes = document.querySelectorAll('.spacegraph-html-node');
            const results = Array.from(nodes).map(node => {
                const inner = node.querySelector('.node-content');
                return {
                    id: (node as HTMLElement).dataset.nodeId,
                    hasContent: inner && inner.innerHTML.length > 0,
                    innerHTML: inner ? inner.innerHTML.substring(0, 100) + '...' : 'MISSING',
                    visible: (node as HTMLElement).offsetParent !== null,
                    rect: node.getBoundingClientRect()
                };
            });
            return results;
        });

        console.log('Node Stats:', JSON.stringify(stats, null, 2));

        await browser.close();
    } catch (e) {
        console.error(`  ✗ Failed to verify ${demoName}:`, (e as Error).message);
    } finally {
        viteProcess.kill();
    }
}

async function main() {
    if (!fs.existsSync('verification')) fs.mkdirSync('verification');
    await verifyDemo('html-simple-test');
    await verifyDemo('html-paradigm');
}

main();
