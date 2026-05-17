# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vision.spec.ts >> SpaceGraph Vision System E2E >> should detect bounding-box overlaps autonomously
- Location: test/vision.spec.ts:30:5

# Error details

```
Error: expect(received).rejects.toThrow()

Received promise resolved instead of rejected
Resolved to value: undefined
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { createVisionAssert } from '../src/vision/assert';
  3  | import path from 'path';
  4  | import { fileURLToPath } from 'url';
  5  | import { spawn } from 'child_process';
  6  |
  7  | const __filename = fileURLToPath(import.meta.url);
  8  | const __dirname = path.dirname(__filename);
  9  |
  10 | test.describe('SpaceGraph Vision System E2E', () => {
  11 |     test.setTimeout(60000);
  12 |
  13 |     const fixtureDir = path.resolve(__dirname, 'fixtures');
  14 |     let serverProcess: any;
  15 |
  16 |     test.beforeAll(async () => {
  17 |         // Start a static server to host the fixture dir
  18 |         serverProcess = spawn('npx', ['vite', '--port', '5176', '--no-open'], { cwd: path.resolve(__dirname, '..'),
  19 |             stdio: 'ignore',
  20 |         });
  21 |         await new Promise((resolve) => setTimeout(resolve, 2000));
  22 |     });
  23 |
  24 |     test.afterAll(() => {
  25 |         if (serverProcess) {
  26 |             serverProcess.kill();
  27 |         }
  28 |     });
  29 |
  30 |     test('should detect bounding-box overlaps autonomously', async ({ page }) => {
  31 |         page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
  32 |         page.on('pageerror', err => console.error(`[Browser Error] ${err.message}`));
  33 |
  34 |         await page.goto('http://localhost:5176/test/fixtures/index.html', { waitUntil: 'networkidle' });
  35 |
  36 |         // Wait for SpaceGraph instances to register
  37 |         await page.waitForFunction(() => {
  38 |             const w = window as any;
  39 |             return w.SpaceGraph && w.SpaceGraph.instances && w.SpaceGraph.instances.size > 0;
  40 |         }, { timeout: 15000 });
  41 |
  42 |         // Allow layout to settle
  43 |         await page.waitForTimeout(2000);
  44 |
  45 |         await page.evaluate(() => { const sg = Array.from((window as any).SpaceGraph.instances)[0] as any; if (sg && sg.vision) sg.vision.modelsLoaded = true; });
  46 |         const visionAssert = createVisionAssert(page);
  47 |
> 48 |         await expect(visionAssert.noOverlap()).rejects.toThrow(/Expected no overlaps/);
     |               ^ Error: expect(received).rejects.toThrow()
  49 |     });
  50 |
  51 |     test('n8n workflow renders without overlaps', async ({ page }) => {
  52 |         page.on('console', msg => console.log(`[Browser 2] ${msg.text()}`));
  53 |         await page.goto('http://localhost:5176/demo/n8n-workflow.html', { waitUntil: 'networkidle' });
  54 |
  55 |         // Wait for SpaceGraph instances to register
  56 |         await page.waitForFunction(() => {
  57 |             const w = window as any;
  58 |             return w.SpaceGraph && w.SpaceGraph.instances && w.SpaceGraph.instances.size > 0;
  59 |         }, { timeout: 15000 });
  60 |
  61 |         // trigger auto layout to resolve overlaps
  62 |         await page.evaluate(async () => {
  63 |             console.log('Evaluating Layout...');
  64 |             const SpaceGraph = (window as any).SpaceGraph;
  65 |             const sg = Array.from(SpaceGraph.instances as Set<any>)[0];
  66 |             const forceLayout = sg.pluginManager.getPlugin('ForceLayout');
  67 |
  68 |             if (forceLayout && forceLayout.update) {
  69 |                 console.log('Applying ForceLayout...');
  70 |                 // Run enough iterations for the force layout physics to completely separate nodes
  71 |                 // The n8n graph has wide nodes, so we need more separation force
  72 |                 forceLayout.settings.repulsion = 500000;
  73 |                 forceLayout.settings.linkDistance = 1000;
  74 |                 for (let i = 0; i < 3000; i++) {
  75 |                     forceLayout.update(0.016);
  76 |                 }
  77 |                 await new Promise(r => setTimeout(r, 100));
  78 |             }
  79 |         });
  80 |
  81 |         // Allow layout to settle
  82 |         await page.waitForTimeout(3000);
  83 |         await page.evaluate(() => { const sg = Array.from((window as any).SpaceGraph.instances)[0] as any; if(sg.vision) sg.vision.modelsLoaded = true; });
  84 |
  85 |         const visionAssert = createVisionAssert(page);
  86 |
  87 |         await expect(visionAssert.noOverlap()).resolves.toBeUndefined();
  88 |         console.log('n8n test finished successfully');
  89 |     });
  90 |
  91 | });
  92 |
```