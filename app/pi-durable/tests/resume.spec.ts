import { expect, test } from '@playwright/test';
import { rmSync } from 'node:fs';
import { startServer } from './server-process';

const PORT = 8799;

const answerCount = async (base: string): Promise<number> => {
    const body = await (await fetch(`${base}/api/export?format=md&id=1`)).text();
    return body.match(/Paris\./g)?.length ?? 0;
};

test('a server restart resumes the conversation without a duplicate answer', async () => {
    let server = await startServer(PORT);
    try {
        const accepted = await (
            await fetch(`${server.base}/api/conversations/1/prompt`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ text: 'Capital of France?', requestId: 'restart-check-1', mode: 'steer' }),
            })
        ).json();
        expect(accepted).toMatchObject({ status: 'accepted' });
        await expect.poll(() => answerCount(server.base)).toBe(1);

        await server.stop();
        server = await startServer(PORT, { PI_DURABLE_DIR: server.dir });
        const health = await server.health();
        expect(health).toMatchObject({ ok: true, storage: 'jsonl', provider: 'faux' });
        expect(health.conversations).toBeGreaterThanOrEqual(1);

        const retry = await (
            await fetch(`${server.base}/api/conversations/1/prompt`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ text: 'Capital of France?', requestId: 'restart-check-1', mode: 'steer' }),
            })
        ).json();
        expect(retry).toMatchObject({ status: 'duplicate' });
        expect(await answerCount(server.base)).toBe(1);
    } finally {
        await server.stop();
        rmSync(server.dir, { recursive: true, force: true });
    }
});
