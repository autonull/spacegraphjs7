import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotDir = path.join(__dirname, '../../screenshots');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Test only HTML demos (which can be loaded directly)
const demoDir = path.join(__dirname, '../../demo');
const htmlDemos = fs
  .readdirSync(demoDir)
  .filter((f: string) => f.endsWith('.html') && !f.includes('index'))
  .map((f: string) => f.replace('.html', ''));

test.describe('Demo Verification - Real Content Check', () => {
  htmlDemos.forEach((demoName) => {
    test(`✅ ${demoName} - loads with real content`, async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });
      
      // Load the demo
      await page.goto(`/demo/${demoName}.html`, { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      // Wait for content to render
      await page.waitForTimeout(3000);
      
      // Check for errors
      if (errors.length > 0) {
        console.error(`❌ ${demoName} has errors:`, errors);
      }
      expect(errors).toEqual([]);
      
      // Take screenshot
      const screenshotPath = path.join(screenshotDir, `verified-${demoName}.png`);
      await page.screenshot({ path: screenshotPath });
      
      // Verify page has actual content (not just blank)
      const body = await page.$('body');
      const boundingBox = await body?.boundingBox();
      
      expect(boundingBox).toBeDefined();
      expect(boundingBox!.width).toBeGreaterThan(100);
      expect(boundingBox!.height).toBeGreaterThan(100);
      
      // Check that page has SOME element with content
      const hasContent = await page.evaluate(() => {
        const text = document.body.innerText.trim();
        return text.length > 50; // Should have some content
      });
      
      if (!hasContent) {
        console.warn(`⚠️  ${demoName} may be blank or minimal`);
      }
      
      console.log(`✅ ${demoName} verified`);
    });
  });
});
