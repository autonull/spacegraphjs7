import { chromium } from 'playwright';
import { spawn } from 'child_process';
import * as fs from 'fs';

async function main() {
    const PORT = 5188;
    console.log(`Starting dev server on port ${PORT}...`);
    const viteProcess = spawn('npx', ['vite', '--config', 'vite.demo.config.ts', '--port', PORT.toString(), '--strictPort'], { stdio: 'pipe' });

    // Wait for the server to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

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
            'index.html?demo=basic',
            'index.html?demo=n8n',
            'index.html?demo=fractal',
            'empty.html',
            'single-node.html',
            'html.html',
            'large.html',
            'instanced.html',
            'complex-hud-layout.html',
            'minimap.html',
            'data-viz.html',
            'media-nodes.html',
            'mixed-topology.html',
            'benchmark.html',
            'inter-graph-edges.html',
            'viewport-serialization.html'
        ];

        for (const demo of demos) {
            console.log(`Verifying demo: ${demo}`);
            await page.goto(`http://localhost:${PORT}/${demo}`);

            // Wait based on whether the demo is expected to create a canvas
            if (demo.includes('?demo=') || (demo !== 'index.html' && !demo.startsWith('../examples/'))) {
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
                await page.waitForFunction(() => !!document.querySelector('#demo-select'), {
                    timeout: 15000,
                });
                await page.waitForTimeout(2000); // Give it time to load
            }

            const name = demo.replace('index.html?demo=', 'gallery-').split('/').pop().replace('.html', '');
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
