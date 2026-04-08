import { chromium } from 'playwright';
import { spawn } from 'child_process';
import * as fs from 'fs';

async function main() {
    console.log('Starting dev server...');
    const viteProcess = spawn('npx', ['vite', '--config', 'vite.demo.config.ts', '--port', '5174'], { stdio: 'pipe' });

    // Wait for the server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Listen to output to make sure it is starting correctly
    viteProcess.stdout.on('data', (data) => {
        console.log(`Vite: ${data}`);
    });
    viteProcess.stderr.on('data', (data) => {
        console.error(`Vite error: ${data}`);
    });

    if (!fs.existsSync('verification')) {
        fs.mkdirSync('verification');
    }

    try {
        console.log('Launching playwright...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        page.on('console', msg => console.log('Browser console:', msg.text()));
        page.on('pageerror', err => console.log('Browser error:', err));

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
            '../examples/media-nodes.html',
            '../examples/mixed-topology.html',
            '../examples/benchmark.html',
            '../examples/inter-graph-edges.html',
            '../examples/viewport-serialization.html',
            '../examples/fractal-lod.html'
        ];

        for (const demo of demos) {
            console.log(`Verifying demo: ${demo}`);
            await page.goto(`http://localhost:5174/demo/${demo}`);

            // Wait based on whether the demo is expected to create a canvas
            if (demo !== 'index.html' && !demo.startsWith('../examples/')) {
                // Let the module load and create the canvas
                await page.waitForFunction(() => !!document.querySelector('canvas'), {
                    timeout: 10000,
                });
                await page.waitForTimeout(2000); // Give the graph 2 seconds to stabilize its layout
            } else if (demo.startsWith('../examples/')) {
                // Examples are loaded using an iframe or different structure if index.html isn't the root container
                // but let's wait a bit and just assert rendering based on file name or generic delay.
                // Assuming Examples just load a canvas.
                await page.waitForTimeout(3000);
            } else {
                // Index is just an HTML page with links, wait for it to render
                await page.waitForFunction(() => !!document.querySelector('button'), {
                    timeout: 10000,
                });
                await page.waitForTimeout(1000); // Give it time to load the first demo's canvas
            }

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
