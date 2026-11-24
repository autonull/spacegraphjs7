import { expect, test } from '@playwright/test';
import { existsSync, rmSync } from 'node:fs';
import { startLlamaServer, startServer } from './server-process';

const MODEL_PATH = process.env.PI_DURABLE_TEST_GGUF ?? '/home/me/gguf/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf';
const LLAMA_PORT = 9932;
const SERVER_PORT = 8801;

test('a local llama.cpp model commits a real offline answer', async () => {
    test.setTimeout(240_000);
    if (!existsSync(MODEL_PATH)) test.skip(true, `GGUF fixture missing: ${MODEL_PATH}`);

    const llama = await startLlamaServer(LLAMA_PORT, MODEL_PATH);
    let server: Awaited<ReturnType<typeof startServer>> | undefined;
    try {
        server = await startServer(SERVER_PORT, {
            PI_DURABLE_PROVIDER: 'local',
            PI_DURABLE_MODEL_PATH: MODEL_PATH,
            PI_DURABLE_MODEL_URL: `${llama.base}/v1`,
        });
        const health = await server.health();
        expect(health).toMatchObject({ provider: 'local', providerMode: 'live', model: 'local-model' });

        const id = String((await (await fetch(`${server.base}/api/conversations`)).json())[0]?.id ?? '1');
        const prompt = await (await fetch(`${server.base}/api/conversations/${id}/prompt`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                text: 'Reply with exactly: ready.',
                requestId: `local-model-${crypto.randomUUID()}`,
                mode: 'steer',
            }),
        })).json();
        expect(prompt).toMatchObject({ status: 'accepted' });

        await expect
            .poll(async () => {
                const body = await (await fetch(`${server!.base}/api/export?format=md&id=${id}`)).text();
                return /- pi\.assistant: (?!\[\]|"")/.test(body);
            }, { timeout: 180_000 })
            .toBe(true);
    } finally {
        if (server) {
            await server.stop();
            rmSync(server.dir, { recursive: true, force: true });
        }
        await llama.stop();
    }
});
