import { chromium } from 'playwright';
import { spawn } from 'child_process';
import * as fs from 'fs';

async function main() {
    console.log('Starting dev server...');
    const viteProcess = spawn('npx', ['vite', 'demo', '--port', '5174'], { stdio: 'pipe' });

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
            { path: 'demo/verification.html', name: 'verification' },
            { path: 'demo/single-node.html', name: 'single-node' },
            { path: 'demo/html.html', name: 'html' },
            { path: 'demo/instanced.html', name: 'instanced' },
            { path: 'demo/large.html', name: 'large' },
        ];

        for (const demo of demos) {
            try {
                console.log(`\nCapturing: ${demo.name}`);
                
                // Direct navigation with full wait
                await page.goto(`http://localhost:5174/${demo.path}`, { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
                
                // Wait for rendering
                await page.waitForTimeout(5000);

                await page.screenshot({ path: `verification/${demo.name}.png` });
                console.log(`  ✓ ${demo.name}.png`);
            } catch (e) {
                console.error(`  ✗ ${demo.name}:`, (e as Error).message);
            }
        }

        await browser.close();
        console.log('\n✓ Complete!');
    } catch (e) {
        console.error('Failed:', e);
    } finally {
        viteProcess.kill();
        console.log('Server stopped.');
        process.exit(0);
    }
}

main();
