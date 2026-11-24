import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const APP = resolve(import.meta.dirname, '..');

export type TestServer = {
    readonly base: string;
    readonly dir: string;
    readonly health: () => Promise<Record<string, unknown>>;
    readonly stop: () => Promise<void>;
};

/** An isolated server process: no shared JSONL state and no port collision with the e2e webServer. */
export const startServer = async (
    port: number,
    env: Readonly<Record<string, string>> = {},
): Promise<TestServer> => {
    const dir = env.PI_DURABLE_DIR ?? mkdtempSync(join(tmpdir(), 'pi-durable-server-'));
    const base = `http://127.0.0.1:${port}`;
    const child: ChildProcess = spawn('pnpm', ['exec', 'tsx', 'src/server.ts'], {
        cwd: APP,
        env: {
            ...process.env,
            PI_DURABLE_SERVER_PORT: String(port),
            PI_DURABLE_DIR: dir,
            PI_DURABLE_STORAGE: 'jsonl',
            ...env,
        },
        detached: true,
        stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            if ((await fetch(`${base}/api/health`)).ok) {
                return {
                    base,
                    dir,
                    health: async () => (await fetch(`${base}/api/health`)).json() as Promise<Record<string, unknown>>,
                    stop: () => stop(child),
                };
            }
        } catch {
            await new Promise((done) => setTimeout(done, 100));
        }
    }
    await stop(child);
    throw new Error(`test server on ${port} did not become healthy`);
};

const stop = async (child: ChildProcess): Promise<void> => {
    process.kill(-child.pid!, 'SIGINT');
    await new Promise((done) => child.once('exit', done));
};
