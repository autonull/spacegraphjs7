import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { call, settle } from './boot';
import { STORIES, type Story, type StoryFrame } from '../src/stories';

const OUT = process.env.SG_DURABLE_SHOTS ?? resolve(import.meta.dirname, '../../../docs/screenshots');
const requested = process.env.SG_DURABLE_STORY?.split(',').map((id) => id.trim()).filter(Boolean);
const stories: readonly Story[] = requested?.length ? STORIES.filter((story) => requested.includes(story.id)) : STORIES;

const ready = async (page: Page): Promise<void> => {
    await page.waitForFunction(
        () => (window as { __durable?: { ready?: () => boolean } }).__durable?.ready?.() === true,
        undefined,
        { timeout: 10_000 },
    );
};

const apply = async (page: Page, frame: StoryFrame): Promise<void> => {
    if ('shot' in frame) {
        await page.goto(`/?shot=${frame.shot}&seed=fixed`);
        await ready(page);
    } else if (frame.action === 'prompt') {
        const before = await call<number>(page, 'ops');
        await call(page, 'prompt', frame.value ?? '');
        await expect.poll(() => call<number>(page, 'ops')).toBeGreaterThan(before);
    } else if (frame.action === 'approve') {
        await page.locator('#approve-button').click();
        await expect
            .poll(() => page.locator('#canvas .durable-card[data-kind="task"]').first().getAttribute('data-status'))
            .toBe('complete');
    } else {
        await call(page, frame.action, frame.value ?? '');
        if (frame.action === 'setView')
            await expect.poll(() => call<string>(page, 'viewName')).toBe(frame.value);
        if (frame.action === 'setTab')
            await expect.poll(() => call<string>(page, 'activeTab')).toBe(frame.value);
        if (frame.action === 'reveal')
            await expect(page.locator('#inspector')).toContainText(frame.value ?? '');
    }
    await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
    await settle(page);
};

type Frame = { readonly data: string; readonly caption: string };

const compose = async (page: Page, frames: readonly Frame[]): Promise<Buffer> => {
    const dataURL = await page.evaluate(async (items: readonly Frame[]) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 1000;
        const context = canvas.getContext('2d')!;
        context.fillStyle = '#0b1016';
        context.fillRect(0, 0, canvas.width, canvas.height);
        for (const [index, item] of items.entries()) {
            const x = (index % 2) * 800;
            const y = Math.floor(index / 2) * 500;
            const image = new Image();
            image.src = item.data;
            await image.decode();
            context.drawImage(image, x, y, 800, 500);
            context.fillStyle = '#0b1016ee';
            context.fillRect(x, y + 454, 800, 46);
            context.fillStyle = '#e8eef5';
            context.font = '600 15px ui-monospace, monospace';
            context.fillText(item.caption, x + 14, y + 483);
        }
        return canvas.toDataURL('image/png');
    }, frames);
    return Buffer.from(dataURL.slice(dataURL.indexOf(',') + 1), 'base64');
};

for (const story of stories) {
    test(`${story.id} composite shows a sequence from pure shot state`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.setViewportSize({ width: 1600, height: 1000 });
        const frames: Frame[] = [];
        for (const frame of story.frames) {
            await apply(page, frame);
            const vision = await call<{ score: number }>(page, 'vision');
            expect(vision.score).toBeGreaterThan(0.5);
            const png = await page.screenshot({ animations: 'disabled' });
            frames.push({ data: `data:image/png;base64,${png.toString('base64')}`, caption: frame.caption });
        }
        const composite = await compose(page, frames);
        expect(composite.length).toBeGreaterThan(10_000);
        const file = resolve(OUT, story.file);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, composite);
        expect(errors).toEqual([]);
    });
}
