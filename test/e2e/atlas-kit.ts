import { expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEMOS } from '../../app/demo/src/registry.js';

// Shared capture layer for the unified demo/test atlases. A "shot" is data; every surface exposes
// a window API and the same boot/configure/verify/capture pipeline drives it.

export const OUT = process.env.SG_ATLAS_DIR ?? resolve('docs/screenshots/atlas');
export const VIEWPORT = { width: 1440, height: 900 };

const SCREENSHOT_ERRORS = [
    'WebSocket connection',
    'ERR_CONNECTION_REFUSED',
    'Outdated Optimize Dep',
    'Failed to load resource: the server responded with a status of 400',
    'Failed to load resource: the server responded with a status of 403',
] as const;

/** Known console noise, by gate strictness: basic checks, screenshot gates, full atlas. */
export const EXPECTED_ERRORS = {
    basic: SCREENSHOT_ERRORS.slice(0, 2),
    screenshots: SCREENSHOT_ERRORS,
    atlas: ['favicon', ...SCREENSHOT_ERRORS],
} as const;

export const isExpectedError = (message: string, patterns: readonly string[]): boolean =>
    patterns.some((pattern) => message.includes(pattern));

/** SHA-256 of a screenshot buffer or a string signature. */
export const sha256 = (data: Buffer | string): string =>
    createHash('sha256').update(data).digest('hex');

/** Visible SVG text metrics for a frame; callers keep their own selectors and gates. */
export const legibility = (page: Page, selector: string) =>
    page.evaluate((query) => {
        const shapes = [
            ...document.querySelectorAll<SVGElement>(query),
        ].filter((shape) => shape.getClientRects().length > 0);
        const texts = shapes.filter((shape) => shape.tagName === 'text');
        const sizes = texts.map((text) => Number.parseFloat(getComputedStyle(text).fontSize));
        return {
            shapes: shapes.length,
            texts: texts.length,
            minSize: sizes.length ? Math.min(...sizes) : 0,
        };
    }, selector);

export const noErrors = (errors: string[]): void =>
    expect(errors.filter((error) => !error.includes('favicon'))).toEqual([]);

export const htmlDemos = DEMOS.filter((entry) => entry.kind === 'html');
export const htmlDemoIds = htmlDemos.map((entry) => entry.id);

export interface Explorer {
    axes(): string[];
    config(): Record<string, string>;
    effective(): Record<string, string>;
    set(axis: string, value: string): string | undefined;
    reset(): void;
    applyPreset(id: string): boolean;
    compare(enabled: boolean): void;
    select(id: string): void;
    playMotion(): void;
    nodes(): number[];
    diff(): unknown[];
    camera(): { command?: { verb: string }; calls: string[] };
    depth(): Record<string, number>;
    motion(): { frames: number; active: string[]; done: boolean };
    salience(): Record<string, number>;
    widgets(): string[];
    transition(): { t: number; done: boolean };
    matrix(): { axes: string[]; cells: { values: Record<string, string> }[] };
    hash(): string;
}

export type Settings = Record<string, string>;

export interface Snapshot {
    config: Record<string, string>;
    effective: Record<string, string>;
    nodes: number[];
    hash: string;
    depth: Record<string, number>;
    salience: Record<string, number>;
    widgets: string[];
    motion: { frames: number; active: string[]; done: boolean };
    camera: { command?: { verb: string }; calls: string[] };
    diff: unknown[];
}

export interface Shot {
    id: string;
    title: string;
    set?: Settings;
    expectConfig?: Settings;
    preset?: string;
    compare?: boolean;
    theme?: 'dark' | 'light';
    select?: boolean;
    timing?: 'transition' | 'motion';
    target?: 'graph' | 'stage' | 'page';
    selector?: string;
    note?: string;
    verify?: (state: Snapshot, page: Page) => void;
}

export const BASE: Settings = {
    source: 'demo',
    view: 'ribbon',
    level: 'execution',
    lod: 'card',
    shape: 'auto',
    edgeLod: 'arrow',
    depth: 'flat',
    salience: 'none',
    emphasis: 'none',
    motion: 'full',
    widgets: 'none',
    sceneFeature: 'none',
};

export const call = <T>(page: Page, method: keyof Explorer, ...args: unknown[]) =>
    page.evaluate(
        ({ method, args }) =>
            (
                (window as unknown as { __explorer: Explorer }).__explorer[method] as (
                    ...a: unknown[]
                ) => T
            )(...args),
        { method, args },
    );

export const settle = (page: Page) =>
    page.evaluate(
        () =>
            new Promise<void>((done) =>
                requestAnimationFrame(() => requestAnimationFrame(() => done())),
            ),
    );

export async function apply(page: Page, settings: Settings) {
    for (const [axis, value] of Object.entries(settings)) await call(page, 'set', axis, value);
}

export async function configure(page: Page, shot: Shot) {
    await call(page, 'reset');
    await call(page, 'select', '');
    await apply(page, BASE);
    if (shot.preset) expect(await call<boolean>(page, 'applyPreset', shot.preset)).toBe(true);
    for (const [axis, value] of Object.entries(shot.set ?? {}))
        if (BASE[axis] !== value) await call(page, 'set', axis, value);
    await call(page, 'compare', Boolean(shot.compare));
    await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
    }, shot.theme ?? 'dark');
    await settle(page);
}

export function locatorFor(page: Page, shot: Shot) {
    return page.locator(
        shot.target === 'page'
            ? 'body'
            : shot.target === 'stage'
              ? '#stage'
              : (shot.selector ?? '#left-graph'),
    );
}

export async function snapshot(page: Page, shot: Shot) {
    if (shot.timing === 'transition') {
        await call(page, 'set', 'lod', 'detail');
        await page.waitForFunction(
            () => {
                const t = (window as unknown as { __explorer: Explorer }).__explorer.transition();
                return t.t > 0 && t.t < 1 && !t.done;
            },
            undefined,
            { timeout: 3000 },
        );
    }
    if (shot.timing === 'motion') {
        await call(page, 'playMotion');
        await settle(page);
    }
    if (shot.select) {
        const id = await page
            .locator('#left-graph [data-node-id]')
            .first()
            .getAttribute('data-node-id');
        if (id) await call(page, 'select', id);
        await settle(page);
    }

    const locator = locatorFor(page, shot);
    await expect(locator.locator('svg').first()).toBeVisible();
    const { shapes, minSize } = await legibility(
        page,
        '#left-graph svg circle, #left-graph svg rect, #left-graph svg polygon, #left-graph svg text',
    );
    expect(shapes, `${shot.id}: visible shapes`).toBeGreaterThan(0);
    if (minSize) expect(minSize, shot.id).toBeGreaterThanOrEqual(9);

    const [config, effective, nodes, hash, depth, salience, widgets, motion, camera, diff] =
        await Promise.all([
            call<Snapshot['config']>(page, 'config'),
            call<Snapshot['effective']>(page, 'effective'),
            call<number[]>(page, 'nodes'),
            call<string>(page, 'hash'),
            call<Snapshot['depth']>(page, 'depth'),
            call<Snapshot['salience']>(page, 'salience'),
            call<string[]>(page, 'widgets'),
            call<Snapshot['motion']>(page, 'motion'),
            call<Snapshot['camera']>(page, 'camera'),
            call<unknown[]>(page, 'diff'),
        ]);
    const state: Snapshot = {
        config,
        effective,
        nodes,
        hash,
        depth,
        salience,
        widgets,
        motion,
        camera,
        diff,
    };
    expect(nodes[0], `${shot.id}: nodes`).toBeGreaterThan(0);
    for (const [axis, value] of Object.entries(shot.expectConfig ?? shot.set ?? {}))
        expect(state.config[axis], `${shot.id}: ${axis}`).toBe(value);
    shot.verify?.(state, page);

    const frame = await locator.screenshot();
    return {
        state,
        frame,
        sha256: sha256(frame),
        bytes: frame.length,
    };
}

/** Boots a showcase demo and its runtime api, returning collected page errors. */
export async function bootShowcase(page: Page, demo: string, api: string): Promise<string[]> {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('favicon'))
            errors.push(message.text());
    });
    await page.setViewportSize(VIEWPORT);
    await page.goto(`/showcase.html?demo=${demo}`);
    await page.waitForFunction(
        () => (window as { __DEMO_READY?: boolean }).__DEMO_READY === true,
        undefined,
        { timeout: 15_000 },
    );
    await page.waitForFunction((name) => Boolean((window as any)[name]), api, { timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready);
    await settle(page);
    return errors;
}

export async function boot(
    page: Page,
    path = '/explorer.html',
    options: { viewport?: boolean } = {},
) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('favicon'))
            errors.push(message.text());
    });
    if (options.viewport !== false) await page.setViewportSize(VIEWPORT);
    await page.goto(path);
    await page.waitForFunction(() => (window as { __ready?: boolean }).__ready === true);
    await page.evaluate(() => document.fonts.ready);
    return errors;
}

export interface Frame {
    id: string;
    title: string;
    file: string;
    bytes: number;
    sha256: string;
    duplicateOf?: string;
    note?: string;
    config: Record<string, string>;
    effective: Record<string, string>;
    nodes: number[];
    hash: string;
}

export async function captureAll(page: Page, shots: readonly Shot[], dir = OUT) {
    mkdirSync(dir, { recursive: true });
    const frames: Frame[] = [];
    const hashes = new Map<string, string>();
    for (const shot of shots) {
        await configure(page, shot);
        const captured = await snapshot(page, shot);
        const file = `${shot.id}.png`;
        writeFileSync(resolve(dir, file), captured.frame);
        const duplicateOf = hashes.get(captured.sha256);
        hashes.set(captured.sha256, shot.id);
        frames.push({
            id: shot.id,
            title: shot.title,
            file,
            bytes: captured.bytes,
            sha256: captured.sha256,
            duplicateOf,
            note: shot.note,
            config: captured.state.config,
            effective: captured.state.effective,
            nodes: captured.state.nodes,
            hash: captured.state.hash,
        });
    }
    return frames;
}

export function writeManifest(dir: string, name: string, payload: unknown) {
    writeFileSync(resolve(dir, name), JSON.stringify(payload, null, 2));
}
