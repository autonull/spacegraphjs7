import { expect, test } from '@playwright/test';
import { rmSync } from 'node:fs';
import { startServer } from './server-process';

// The e2e observer webServer owns 8800; use a separate port so health() reads this child.
const PORT = 8811;

test('live provider opt-in fails with a typed error when no key is configured', async () => {
    const server = await startServer(PORT, { PI_DURABLE_PROVIDER: 'openai', OPENAI_API_KEY: '' });
    try {
        const health = await server.health();
        expect(health).toMatchObject({
            provider: 'openai',
            providerMode: 'live',
            model: 'gpt-4o-mini',
            providerError: {
                error: 'no-provider',
                recovery: 'set OPENAI_API_KEY or unset PI_DURABLE_PROVIDER',
            },
        });
        const response = await fetch(`${server.base}/api/conversations/1/prompt`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text: 'Capital of France?', requestId: 'no-key-check', mode: 'steer' }),
        });
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({
            error: 'no-provider',
            recovery: 'set OPENAI_API_KEY or unset PI_DURABLE_PROVIDER',
        });
    } finally {
        await server.stop();
        rmSync(server.dir, { recursive: true, force: true });
    }
});
