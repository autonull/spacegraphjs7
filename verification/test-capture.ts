import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function main() {
    const viteProcess = spawn('npx', ['vite', '--port', '5180'], { 
        cwd: 'demo', stdio: 'pipe' 
    });
    await new Promise(r => setTimeout(r, 5000));

    const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    page.on('console', m => console.log('[CONSOLE]', m.type(), m.text()));
    page.on('pageerror', e => console.error('[PAGE ERROR]', e.message));
    
    console.log('Navigating to test-direct.html...');
    const response = await page.goto('http://localhost:5180/test-direct.html', { 
        waitUntil: 'networkidle', timeout: 30000 
    });
    console.log('Response status:', response?.status());
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
    
    await page.waitForTimeout(5000);
    
    const html = await page.content();
    console.log('Page contains "DIRECT TEST":', html.includes('DIRECT TEST'));
    console.log('Page contains "SUCCESS":', html.includes('SUCCESS'));
    
    await page.screenshot({ path: 'verification/test-direct.png', fullPage: false });
    console.log('✓ Screenshot saved to verification/test-direct.png');
    
    await browser.close();
    viteProcess.kill();
    process.exit(0);
}
main();
