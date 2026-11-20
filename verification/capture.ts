import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { DEMOS, demoPath } from '../app/demo/src/registry.js';

// Single replacement for the retired capture_{all,final,from_demo,screenshots}.ts and
// verify_demos.ts scripts. Usage: tsx verification/capture.ts [demo-id ...]
// Defaults to the flagship set; reads every demo id from the registry when passed `all`.

const args = process.argv.slice(2);
const port = Number(process.env.SG_CAPTURE_PORT ?? 5188);
const out = resolve(process.env.SG_CAPTURE_DIR ?? 'verification');
const ids = args.length
    ? args.flatMap((id) => (id === 'all' ? DEMOS.map((entry) => entry.id) : [id]))
    : ['verification', 'single-node', 'html', 'instanced', 'large'];

const server = spawn(
    'pnpm',
    ['exec', 'vite', '--config', 'app/demo/vite.config.ts', '--port', String(port), '--strictPort'],
    {
        cwd: resolve('.'),
        stdio: 'ignore',
    },
);

async function main() {
    mkdirSync(out, { recursive: true });
    for (let attempt = 0; attempt < 40; attempt++) {
        try {
            const probe = await fetch(`http://localhost:${port}/index.html`);
            if (probe.ok) break;
        } catch {}
        await new Promise((done) => setTimeout(done, 250));
    }
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    for (const id of ids) {
        const entry = DEMOS.find((candidate) => candidate.id === id);
        if (!entry || entry.kind !== 'html') {
            console.warn(`skip ${id}: no HTML page in registry`);
            continue;
        }
        await page.goto(`http://localhost:${port}${demoPath(id)}`, {
            waitUntil: 'domcontentloaded',
        });
        await page.locator('canvas, svg, #app').first().waitFor({ timeout: 10_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        await page.screenshot({ path: resolve(out, `${id}.png`) });
        console.log(`captured ${id}`);
    }
    await browser.close();
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => server.kill());
