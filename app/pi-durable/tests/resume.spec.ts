import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const APP = resolve(import.meta.dirname, '..');
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;

const start = async (dir: string): Promise<ChildProcess> => {
    const child = spawn('pnpm', ['exec', 'tsx', 'src/server.ts'], {
        cwd: APP,
        env: {
            ...process.env,
            PI_DURABLE_SERVER_PORT: String(PORT),
            PI_DURABLE_DIR: dir,
            PI_DURABLE_STORAGE: 'jsonl',
        },
        detached: true,
        stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            if ((await fetch(`${BASE}/api/health`)).ok) return child;
        } catch {
            await new Promise((done) => setTimeout(done, 100));
        }
    }
    process.kill(-child.pid!, 'SIGINT');
    throw new Error('restarted server did not become healthy');
};

const stop = async (child: ChildProcess): Promise<void> => {
    process.kill(-child.pid!, 'SIGINT');
    await new Promise((done) => child.once('exit', done));
};

const answerCount = async (): Promise<number> => {
    const body = await (await fetch(`${BASE}/api/export?format=md&id=1`)).text();
    return body.match(/Paris\./g)?.length ?? 0;
};

test('a server restart resumes the conversation without a duplicate answer', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pi-durable-resume-'));
    let first: ChildProcess | undefined;
    let second: ChildProcess | undefined;
    try {
        first = await start(dir);
        const accepted = await (
            await fetch(`${BASE}/api/conversations/1/prompt`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ text: 'Capital of France?', requestId: 'restart-check-1', mode: 'steer' }),
            })
        ).json();
        expect(accepted).toMatchObject({ status: 'accepted' });
        await expect.poll(answerCount).toBe(1);

        await stop(first);
        first = undefined;
        second = await start(dir);
        const health = await (await fetch(`${BASE}/api/health`)).json();
        expect(health).toMatchObject({ ok: true, storage: 'jsonl', provider: 'faux' });
        expect(health.conversations).toBeGreaterThanOrEqual(1);

        const retry = await (
            await fetch(`${BASE}/api/conversations/1/prompt`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ text: 'Capital of France?', requestId: 'restart-check-1', mode: 'steer' }),
            })
        ).json();
        expect(retry).toMatchObject({ status: 'duplicate' });
        expect(await answerCount()).toBe(1);
    } finally {
        if (first) await stop(first);
        if (second) await stop(second);
        rmSync(dir, { recursive: true, force: true });
    }
});
