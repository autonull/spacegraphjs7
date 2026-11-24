import { describe, expect, it } from 'vitest';
import { startServer } from './server-process';

const post = (base: string, path: string, body: object): Promise<Response> =>
    fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });

const waitFor = async (check: () => Promise<boolean>): Promise<void> => {
    for (let attempt = 0; attempt < 100; attempt++) {
        if (await check()) return;
        await new Promise((done) => setTimeout(done, 50));
    }
    throw new Error('condition did not become true');
};

describe('read-only observer', () => {
    it('reads owner commits and rejects observer writes', async () => {
        const owner = await startServer(8861);
        try {
            await post(owner.base, '/api/conversations/1/prompt', {
                text: 'observer-visible', requestId: 'observer-1',
            });
            await waitFor(async () => {
                const reply = await fetch(`${owner.base}/api/export?format=json&id=1`);
                const body = await reply.json() as { view?: { entries?: readonly { kind: string }[] } };
                return body.view?.entries?.some((entry) => entry.kind === 'pi.assistant') ?? false;
            });

            const observer = await startServer(8862, {
                PI_DURABLE_OBSERVER: '1',
                PI_DURABLE_DIR: owner.dir,
            });
            try {
                expect(await observer.health()).toMatchObject({ observer: true, readOnly: true });
                const controller = new AbortController();
                const stream = await fetch(`${observer.base}/events/observe`, { signal: controller.signal });
                const reader = stream.body!.getReader();
                const { value } = await reader.read();
                controller.abort();
                expect(Buffer.from(value ?? new Uint8Array()).toString()).toContain('observer-visible');

                const rejected = await post(observer.base, '/api/conversations/1/prompt', {
                    text: 'must not commit', requestId: 'observer-2',
                });
                expect(rejected.status).toBe(403);
                expect(await rejected.json()).toMatchObject({
                    error: 'read-only', recovery: 'commit through the owner server',
                });
            } finally {
                await observer.stop();
            }
        } finally {
            await owner.stop();
        }
    }, 30_000);
});
