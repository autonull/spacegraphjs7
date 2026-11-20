// Drives the published demo host: serves the external consumer with Vite (no source aliases),
// opens the real demo, runs every capability and checks that module requests came from the install.
import { chromium } from 'playwright';
import { createServer } from 'vite';

const consumer = process.env.CONSUMER_ROOT;
if (!consumer) throw new Error('CONSUMER_ROOT is not set');

const server = await createServer({
    root: consumer,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 5201, strictPort: true },
});
await server.listen();
const url = server.resolvedUrls?.local?.[0] ?? 'http://127.0.0.1:5201';
console.log(`serving the published demo host at ${url}`);

const browser = await chromium.launch();
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors: string[] = [];
    const requests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text());
    });
    page.on('request', (request) => requests.push(request.url()));

    await page.goto(`${url}demo.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => (window as any).__ready === true, undefined, { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);

    const failures: string[] = [];
    const check = (name: string, ok: boolean, detail = '') => {
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
        if (!ok) failures.push(name);
    };

    const capabilities = await page.evaluate(
        () => (window as any).__demo.capabilities() as string[],
    );
    check('the demo host mounted from the consumer', Array.isArray(capabilities) && capabilities.length > 0);
    check('the SpaceGraph renderer drew a canvas', await page.locator('#canvas canvas').first().isVisible());

    for (const id of capabilities) {
        await page.locator(`[data-capability="${id}"]`).click();
        const evidence = await page.evaluate(() => (window as any).__demo.evidence() as string[]);
        check(`capability ${id} produced evidence`, evidence.length > 0);
    }

    for (const renderer of ['cytoscape', 'svg', 'spacegraph']) {
        await page.locator(`#renderer-${renderer}`).click();
        await page.waitForFunction(
            (id) => (document.querySelector('#stage') as HTMLElement | null)?.dataset.renderer === id,
            renderer,
            { timeout: 10_000 },
        );
        const drawn = renderer === 'svg' ? '#svg svg' : '#canvas canvas';
        await page.locator(drawn).first().waitFor({ state: 'visible', timeout: 10_000 });
        check(`the published ${renderer} renderer drew`, true);
    }

    const packageRequests = requests.filter((request) => request.includes('@spacegraphjs'));
    const workspaceRequests = packageRequests.filter((request) => request.includes('/@fs/'));
    check(
        'package modules resolved from the consumer install',
        packageRequests.length > 0 && workspaceRequests.length === 0,
        workspaceRequests.join(' | '),
    );
    check('the page raised no uncaught error', errors.length === 0, errors.join(' | '));

    if (failures.length) {
        console.error(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
        process.exit(1);
    }
    console.log('\ndemo browser check passed');
} finally {
    await browser.close();
    await server.close();
}
