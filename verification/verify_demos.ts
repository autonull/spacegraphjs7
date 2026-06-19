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

            // Wait for stability based on demo type
            if (demo.startsWith('index.html')) {
                // Index/Gallery mode: wait for the initial demo to finish loading via our custom flag
                await page.waitForFunction(() => (window as any).__DEMO_READY === true, {
                    timeout: 20000,
                });
                await page.waitForTimeout(1000);
            } else {
                // Standalone demos: wait for canvas
                await page.waitForFunction(() => {
                    const canvas = document.querySelector('canvas');
                    return canvas && canvas.width > 0 && canvas.height > 0;
                }, {
                    timeout: 15000,
                });
                await page.waitForTimeout(2000);
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
