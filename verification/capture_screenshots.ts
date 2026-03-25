import { chromium } from 'playwright';
import { spawn } from 'child_process';
import * as fs from 'fs';

async function main() {
    console.log('Starting dev server...');
    const viteProcess = spawn('npx', ['vite', '--port', '5174'], { stdio: 'pipe' });

    // Wait for the server to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (!fs.existsSync('verification')) {
        fs.mkdirSync('verification');
    }

    try {
        console.log('Launching playwright...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        const demos = [
            { path: 'demo/empty.html', name: 'empty' },
            { path: 'demo/single-node.html', name: 'single-node' },
            { path: 'demo/html.html', name: 'html' },
            { path: 'demo/instanced.html', name: 'instanced' },
            { path: 'demo/large.html', name: 'large' },
            { path: 'examples/complex-hud-layout.html', name: 'complex-hud-layout' },
            { path: 'examples/minimap.html', name: 'minimap' },
            { path: 'examples/data-viz.html', name: 'data-viz' },
            { path: 'examples/media-nodes.html', name: 'media-nodes' },
            { path: 'examples/mixed-topology.html', name: 'mixed-topology' },
        ];

        for (const demo of demos) {
            try {
                console.log(`\nCapturing demo: ${demo.name}`);
                await page.goto(`http://localhost:5174/${demo.path}`, { waitUntil: 'networkidle', timeout: 15000 });
                
                // Wait for canvas to appear
                try {
                    await page.waitForSelector('canvas', { timeout: 10000 });
                    console.log('  ✓ Canvas found');
                } catch (e) {
                    console.log('  ⚠ No canvas found, skipping...');
                    continue;
                }
                
                // Wait for layout to stabilize
                await page.waitForTimeout(2000);

                await page.screenshot({ path: `verification/${demo.name}.png`, fullPage: false });
                console.log(`  ✓ Captured ${demo.name}.png`);
            } catch (e) {
                console.error(`  ✗ Failed to capture ${demo.name}:`, (e as Error).message);
            }
        }

        await browser.close();
        console.log('\n✓ Screenshot capture complete!');
    } catch (e) {
        console.error('Verification failed:', e);
    } finally {
        viteProcess.kill();
        console.log('Dev server stopped.');
        process.exit(0);
    }
}

main();
