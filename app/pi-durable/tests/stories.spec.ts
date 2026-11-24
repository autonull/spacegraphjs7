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
    await expect(page.locator('#canvas canvas').first()).toBeVisible({ timeout: 10_000 });
    await settle(page);
};

type Frame = { readonly data: string; readonly caption: string };

const compose = async (page: Page, frames: readonly Frame[]): Promise<Buffer> => {
    const canvasPage = await page.context().newPage();
    const dataURL = await canvasPage.evaluate(async (items: readonly Frame[]) => {
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
            context.save();
            context.translate(x + 18, y + 18);
            context.strokeStyle = '#61d4e3';
            context.lineWidth = 1;
            context.strokeRect(-7, -7, 14, 14);
            context.rotate(Math.PI / 4);
            context.strokeRect(-5, -5, 10, 10);
            context.restore();
            context.font = '10px ui-monospace, monospace';
            context.fillStyle = '#8da0b4';
            context.fillText('cosmos · territory · passage · fact · grain', x + 40, y + 21);
            context.beginPath();
            context.moveTo(x + 40, y + 32);
            context.lineTo(x + 100, y + 32);
            context.moveTo(x + 40, y + 28);
            context.lineTo(x + 40, y + 36);
            context.moveTo(x + 100, y + 28);
            context.lineTo(x + 100, y + 36);
            context.stroke();
            context.fillText('scale 500u', x + 108, y + 35);
            context.fillStyle = '#0b1016ee';
            context.fillRect(x, y + 454, 800, 46);
            context.fillStyle = '#e8eef5';
            context.font = '600 15px ui-monospace, monospace';
            context.fillText(item.caption, x + 14, y + 483);
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
