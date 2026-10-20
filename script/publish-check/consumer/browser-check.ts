// Drives the consumer's browser page: serves the consumer with Vite, opens it in Chromium and
// asserts that both interactive adapters mounted and drew.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { resolve } from 'node:path';

const consumer = process.env.CONSUMER_ROOT;
if (!consumer) throw new Error('CONSUMER_ROOT is not set');

const server = await createServer({
  root: consumer,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 5199, strictPort: true },
});
await server.listen();
const url = server.resolvedUrls?.local?.[0] ?? 'http://127.0.0.1:5199';
console.log(`serving the consumer at ${url}`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}browser.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__result), undefined, { timeout: 30_000 });
  const result = await page.evaluate(() => window.__result);

  const failures: string[] = [];
  const check = (name: string, ok: boolean, detail = '') => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures.push(name);
  };

  check('the page mounted without an error', !result?.error, result?.error ?? '');
  check('the SpaceGraph adapter mounted and drew', result?.spacegraph === true);
  check('the Cytoscape adapter mounted and drew', result?.cytoscape === true);
  check('the page raised no uncaught error', errors.length === 0, errors.join(' | '));

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\nbrowser check passed');
} finally {
  await browser.close();
  await server.close();
}
