import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const args = process.argv.slice(2);
  const demos = args.length > 0
    ? args.map(name => ({ name: name.replace('.html', ''), url: `http://localhost:5173/${name.endsWith('.html') ? name : name + '.html'}` }))
    : [
        { name: 'data-viz', url: 'http://localhost:5173/data-viz.html' },
        { name: 'media-nodes', url: 'http://localhost:5173/media-nodes.html' },
        { name: 'n8n-workflow', url: 'http://localhost:5173/n8n-workflow.html' },
        { name: 'alignment-test', url: 'http://localhost:5173/alignment-test.html' }
      ];

  for (const demo of demos) {
    const page = await context.newPage();
    page.on('console', msg => console.log(`[${demo.name}] CONSOLE ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => {
        console.log(`[${demo.name}] PAGE ERROR: ${err.message}`);
        console.log(`[${demo.name}] STACK: ${err.stack}`);
    });

    console.log(`Verifying ${demo.name}...`);
    try {
      await page.goto(demo.url, { waitUntil: 'load' });
      // Wait for SpaceGraph to be initialized and rendered
      await page.waitForFunction(() => window.sg !== undefined || window._sg !== undefined, { timeout: 10000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `verification/${demo.name}_verified.png` });
      console.log(`Screenshot saved for ${demo.name}`);
    } catch (e) {
      console.error(`Failed to verify ${demo.name}: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
})();
