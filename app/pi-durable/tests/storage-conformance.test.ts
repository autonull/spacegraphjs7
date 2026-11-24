import { expect, it } from 'vitest';
import { startServer } from './server-process';

type Report = { readonly backend: string; readonly passed: number; readonly failures: readonly string[] };

it('runs upstream storage conformance on every backend', async () => {
    const server = await startServer(8863, { PI_DURABLE_CONFORMANCE: '1' });
    try {
        const reports = await fetch(`${server.base}/api/conformance`).then((reply) => reply.json() as Promise<readonly Report[]>);
        expect(reports.map((report) => report.backend)).toEqual(['memory', 'custom', 'jsonl', 'sqlite']);
        for (const report of reports) {
            expect(report.passed, report.backend).toBeGreaterThan(0);
            expect(report.failures, report.backend).toEqual([]);
        }
    } finally {
        await server.stop();
    }
}, 120_000);
