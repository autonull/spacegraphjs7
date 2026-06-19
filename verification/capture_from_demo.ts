import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function main() {
    console.log('Starting dev server from demo directory...');
    const viteProcess = spawn('npx', ['vite', '--port', '5180'], { 
        cwd: 'demo',
        stdio: 'pipe' 
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
        console.log('Launching playwright...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        page.on('console', msg => {
            if (msg.type() === 'error') console.error('[PAGE ERROR]', msg.text());
            else console.log('[PAGE]', msg.type(), msg.text());
        });

        const demos = [
            { name: 'verification', wait: 3000 },
            { name: 'single-node', wait: 3000 },
            { name: 'html', wait: 3000 },
            { name: 'instanced', wait: 5000 },
            { name: 'large', wait: 3000 },
        ];

        for (const demo of demos) {
            try {
                console.log(`\nCapturing: ${demo.name}`);
                await page.goto(`http://localhost:5180/${demo.name}.html`, { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
                await page.waitForTimeout(demo.wait);
                await page.screenshot({ path: `../verification/${demo.name}.png` });
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
        process.exit(0);
    }
}

main();
