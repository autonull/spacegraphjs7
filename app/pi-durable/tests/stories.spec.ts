import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { call, expectSurface, settle } from './boot';
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
        const options = {
            ...(frame.replayId ? { replay: true } : {}),
            ...(frame.asOf !== undefined ? { asOf: frame.asOf } : {}),
        };
        const mounted = await page.evaluate(() =>
            Boolean((window as unknown as { __durable?: { loadShot?: unknown } }).__durable?.loadShot),
        ).catch(() => false);
        if (frame.observer || !mounted) {
            await page.goto('about:blank');
            const params = new URLSearchParams({ seed: 'fixed' });
            if (frame.observer) params.set('observer', '1');
            else params.set('shot', frame.shot);
            if (frame.replayId) params.set('replay', frame.replayId);
            if (frame.asOf !== undefined) params.set('asOf', String(frame.asOf));
            await page.goto(`/?${params.toString()}`);
        } else {
            await call(page, 'loadShot', frame.shot, options);
        }
        await ready(page);
    } else if (frame.action === 'prompt') {
        if ((await page.locator('#app').getAttribute('data-observer')) === 'true') {
            await call(page, 'prompt', frame.value ?? '');
            await expect(page.locator('#announcer')).toContainText('read-only');
        } else {
            const before = await call<number>(page, 'ops');
            await call(page, 'prompt', frame.value ?? '');
            await expect.poll(() => call<number>(page, 'ops')).toBeGreaterThan(before);
        }
    } else if (frame.action === 'approve') {
        await page.locator('#approve-button').dispatchEvent('click');
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
    await expectSurface(page);
    await settle(page);
};

type Frame = { readonly data: string; readonly caption: string };

const compose = async (page: Page, frames: readonly Frame[]): Promise<Buffer> => {
    const canvasPage = await page.context().newPage();
    const dataURL = await canvasPage.evaluate(async (items: readonly Frame[]) => {
        const width = 1280;
        const imageHeight = 800;
        const captionHeight = 64;
        const tileHeight = imageHeight + captionHeight;
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = tileHeight * Math.ceil(items.length / 2);
        const context = canvas.getContext('2d')!;
        context.fillStyle = '#0f0e0c';
        context.fillRect(0, 0, canvas.width, canvas.height);
        for (const [index, item] of items.entries()) {
            const x = (index % 2) * width;
            const y = Math.floor(index / 2) * tileHeight;
            const image = new Image();
            image.src = item.data;
            await image.decode();
            context.drawImage(image, x, y, width, imageHeight);
            context.fillStyle = '#191713';
            context.fillRect(x, y + imageHeight, width, captionHeight);
            context.fillStyle = '#d7a45f';
            context.fillRect(x, y + imageHeight, 4, captionHeight);
            context.font = '600 20px ui-monospace, monospace';
            context.fillStyle = '#f2ede3';
            context.fillText(item.caption, x + 20, y + imageHeight + 41);
        }
        return canvas.toDataURL('image/png');
    }, frames);
    await canvasPage.close();
    return Buffer.from(dataURL.slice(dataURL.indexOf(',') + 1), 'base64');
};

for (const story of stories) {
    test(`${story.id} composite shows a sequence from pure shot state`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.setViewportSize({ width: 1280, height: 800 });
        const frames: Frame[] = [];
        for (const frame of story.frames) {
            await apply(page, frame);
            const vision = await call<{ score: number }>(page, 'vision');
            expect(vision.score).toBeGreaterThan(0.5);
            const shot = await page.screenshot({ type: 'jpeg', quality: 85, animations: 'disabled' });
            frames.push({ data: `data:image/jpeg;base64,${shot.toString('base64')}`, caption: frame.caption });
        }
        const composite = await compose(page, frames);
        expect(composite.length).toBeGreaterThan(10_000);
        const file = resolve(OUT, story.file);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, composite);
        expect(errors).toEqual([]);
    });
}
