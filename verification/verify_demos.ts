import { chromium } from 'playwright';
import { spawn } from 'child_process';
import * as fs from 'fs';

async function main() {
    console.log('Starting dev server...');
    const viteProcess = spawn('npx', ['vite', '--port', '5174'], { stdio: 'pipe' });

    // Wait for the server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (!fs.existsSync('verification')) {
        fs.mkdirSync('verification');
    }

    try {
        console.log('Launching playwright...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        const demos = [
            'index.html',
            'empty.html',
            'single-node.html',
            'html.html',
            'large.html',
            'instanced.html',
            '../examples/complex-hud-layout.html',
            '../examples/minimap.html',
            '../examples/data-viz.html',
            '../examples/media-nodes.html'
        ];

        for (const demo of demos) {
            console.log(`Verifying demo: ${demo}`);
            await page.goto(`http://localhost:5174/demo/${demo}`);
            // Let the module load and create the canvas
            await page.waitForFunction(() => !!document.querySelector('canvas'), {
                timeout: 10000,
            });
            await page.waitForTimeout(2000); // Give the graph 2 seconds to stabilize its layout

            const name = demo.split('/').pop().replace('.html', '');
            await page.screenshot({ path: `verification/${name}.png` });
            console.log(`✓ Captured ${name}.png`);
        }

        await browser.close();
    } catch (e) {
        console.error('Verification failed:', e);
    } finally {
        viteProcess.kill();
        console.log('Dev server stopped.');
        process.exit(0);
    }
}

main();
