import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATEGORIES, DEMOS, demoEntry, demoPath } from '../../app/demo/src/registry.js';
import { EXPECTED_ERRORS, htmlDemos, isExpectedError, settle } from './atlas-kit.js';
import { renderAtlasReport, type ReportEntry, type ReportGroup } from './atlas-report.js';

// Full-scope demo atlas. Discovery comes from the demo registry (one source of truth for the
// folder tree) plus window.__demo.capabilities() at runtime. SG_DEMO_ATLAS_DIR moves output;
// SG_DEMO_ATLAS_FILTER limits ids for fast iteration.

const OUT = process.env.SG_DEMO_ATLAS_DIR ?? resolve('docs/screenshots/demo-atlas');
const FILTER = process.env.SG_DEMO_ATLAS_FILTER ?? '';
const VIEWPORT = { width: 1440, height: 900 };
const TIMEOUT = 600_000;

const showcaseDemos = DEMOS.filter((entry) => entry.kind === 'module');

const selected = (id: string) => id.toLowerCase().includes(FILTER.toLowerCase());
const categoryOf = (id: string) => CATEGORIES[demoEntry(id)?.category ?? 'core'];

type DemoApi = {
    capabilities(): string[];
    run(id: string): void;
    evidence(): string[];
    view(): string;
    setView(view: string): void;
};

async function resetHost(page: Page) {
    await page.evaluate(() => {
        document.querySelector<HTMLElement>('[data-depth="flat"]')?.click();
        document.querySelector<HTMLElement>('#renderer-spacegraph')?.click();
        document.querySelector<HTMLElement>('#theme-dark')?.click();
        for (const id of ['overlay-close', 'diff-close']) {
            const button = document.getElementById(id) as HTMLElement | null;
            if (button?.offsetParent) button.click();
        }
    });
    const view = await page.evaluate(() =>
        (window as unknown as { __demo: DemoApi }).__demo.view(),
    );
    if (view !== 'ribbon')
        await page.evaluate(() =>
            (window as unknown as { __demo: DemoApi }).__demo.setView('ribbon'),
        );
}

function tracker(page: Page) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });
    return {
        clear: () => (errors.length = 0),
        errors: () => errors.filter((error) => !isExpectedError(error, EXPECTED_ERRORS.atlas)),
    };
}

async function boot(page: Page, path: string) {
    await page.setViewportSize(VIEWPORT);
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const surface = page.locator('canvas, svg, #app').first();
    if (await surface.count()) await expect(surface).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready);
    await settle(page);
    await page.waitForTimeout(150);
}

async function capture(entry: Omit<ReportEntry, 'bytes' | 'errors'>, errors: string[], page: Page) {
    const frame = await page.screenshot();
    writeFileSync(resolve(OUT, entry.file), frame);
    return { ...entry, bytes: frame.length, errors };
}

async function heading(page: Page) {
    return page.evaluate(() => {
        const element = document.querySelector<HTMLElement>('h1, h2, #demo-title');
        return (element?.textContent ?? document.title).trim().slice(0, 160);
    });
}

async function attempt<T>(work: () => Promise<T>): Promise<{ value?: T; error?: string }> {
    try {
        return { value: await work() };
    } catch (error) {
        return { error: error instanceof Error ? error.message.split('\n')[0] : String(error) };
    }
}

test.describe('full-scope demo atlas', () => {
    test('captures every standalone HTML demo', async ({ page }) => {
        test.setTimeout(TIMEOUT);
        mkdirSync(resolve(OUT, 'html'), { recursive: true });
        const errors = tracker(page);
        const entries: ReportEntry[] = [];
        for (const { id } of htmlDemos.filter((entry) => selected(entry.id))) {
            const started = Date.now();
            errors.clear();
            const result = await attempt(async () => {
                await boot(page, demoPath(id));
                return {
                    title: await heading(page),
                    description: `${categoryOf(id)} · ${demoPath(id)} — ${await page.title()}`,
                };
            });
            const failure = result.error ? [result.error] : [];
            entries.push(
                await capture(
                    {
                        id,
                        title: result.value?.title ?? id,
                        description: result.value?.description ?? categoryOf(id),
                        file: `html/${id}.png`,
                        ms: Date.now() - started,
                    },
                    [...failure, ...errors.errors()],
                    page,
                ),
            );
        }
        const group: ReportGroup = {
            id: 'html',
            title: 'Standalone HTML demos',
            summary:
                'Every capability demo under app/demo/*.html, loaded from the same Vite server CI uses. Runner and documentation pages are covered on their own surfaces below.',
            entries,
        };
        writeFileSync(resolve(OUT, 'html.json'), JSON.stringify(group, null, 2));
        expect(entries.length).toBeGreaterThan(0);
    });

    test('captures every showcase demo', async ({ page }) => {
        test.setTimeout(TIMEOUT);
        mkdirSync(resolve(OUT, 'showcase'), { recursive: true });
        const errors = tracker(page);
        const entries: ReportEntry[] = [];
        for (const { id } of showcaseDemos.filter((entry) => selected(entry.id))) {
            const started = Date.now();
            errors.clear();
            const result = await attempt(async () => {
                await page.setViewportSize(VIEWPORT);
                await page.goto(`/showcase.html?demo=${id}`, { waitUntil: 'domcontentloaded' });
                await page.waitForFunction(
                    () => (window as { __DEMO_READY?: boolean }).__DEMO_READY === true,
                    undefined,
                    { timeout: 10_000 },
                );
                await page.evaluate(() => document.fonts.ready);
                await settle(page);
                await page.waitForTimeout(250);
                return (await heading(page)) || id;
            });
            entries.push(
                await capture(
                    {
                        id,
                        title: result.value ?? id,
                        description: `${categoryOf(id)} · ${demoEntry(id)?.path ?? id} via showcase.html`,
                        file: `showcase/${id}.png`,
                        ms: Date.now() - started,
                    },
                    [...(result.error ? [result.error] : []), ...errors.errors()],
                    page,
                ),
            );
        }
        const group: ReportGroup = {
            id: 'showcase',
            title: 'Showcase demo modules',
            summary:
                'All demos/*.ts modules through showcase.html — WebGL meshes, cameras, physics, HTML nodes, widgets, plugins and interactions.',
            entries,
        };
        writeFileSync(resolve(OUT, 'showcase.json'), JSON.stringify(group, null, 2));
        expect(entries.length).toBeGreaterThan(0);
    });

    test('captures every main-app capability', async ({ page }) => {
        test.setTimeout(TIMEOUT);
        mkdirSync(resolve(OUT, 'capabilities'), { recursive: true });
        const errors = tracker(page);
        await page.setViewportSize(VIEWPORT);
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (window as { __ready?: boolean }).__ready === true);
        const capabilities = await page.evaluate(() =>
            (window as unknown as { __demo: DemoApi }).__demo.capabilities(),
        );
        const entries: ReportEntry[] = [];
        for (const id of capabilities.filter(selected)) {
            const started = Date.now();
            errors.clear();
            const result = await attempt(async () => {
                await resetHost(page);
                await page.evaluate((capability) => {
                    (window as unknown as { __demo: DemoApi }).__demo.run(capability);
                }, id);
                await expect(page.locator('.evidence-line').first()).toBeVisible({
                    timeout: 5_000,
                });
                await settle(page);
                return page.evaluate(() =>
                    (window as unknown as { __demo: DemoApi }).__demo.evidence(),
                );
            });
            const evidence = result.value ?? [];
            entries.push(
                await capture(
                    {
                        id,
                        title:
                            (
                                await page.locator(`[data-capability="${id}"]`).textContent()
                            )?.trim() || id,
                        description: evidence[0] ?? `Capability: ${id}`,
                        file: `capabilities/${id}.png`,
                        ms: Date.now() - started,
                        evidence,
                    },
                    [...(result.error ? [result.error] : []), ...errors.errors()],
                    page,
                ),
            );
        }
        const group: ReportGroup = {
            id: 'capabilities',
            title: 'Main-app capabilities',
            summary:
                'Every capability on index.html, run through window.__demo with its evidence lines rendered beside the graph.',
            entries,
        };
        writeFileSync(resolve(OUT, 'capabilities.json'), JSON.stringify(group, null, 2));
        expect(entries.length).toBeGreaterThan(0);
    });

    test('writes a browsable report from all three surfaces', async () => {
        const groups = ['html', 'showcase', 'capabilities'].flatMap((name) => {
            const path = resolve(OUT, `${name}.json`);
            try {
                return [JSON.parse(readFileSync(path, 'utf8')) as ReportGroup];
            } catch {
                return [];
            }
        });
        expect(groups.length).toBeGreaterThan(0);
        writeFileSync(
            resolve(OUT, 'index.html'),
            renderAtlasReport('SpaceGraphJS — full demo capability atlas', groups),
        );
    });
});
