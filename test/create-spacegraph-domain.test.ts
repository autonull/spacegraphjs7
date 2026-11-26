// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'sg-domain-'));
afterAll(() => rmSync(work, { recursive: true, force: true }));

execFileSync(
    process.execPath,
    [resolve(root, 'packages/create-spacegraph/domain.js'), 'demo-domain'],
    { cwd: work, stdio: 'pipe' },
);

const manifest = (path: string) =>
    JSON.parse(readFileSync(join(work, 'demo-domain', path), 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        scripts?: Record<string, string>;
    };

describe('generated domain workspace', () => {
    it('installs from published ranges instead of unresolved workspace links', () => {
        for (const path of ['domain/package.json', 'host/package.json']) {
            const pkg = manifest(path);
            for (const [name, range] of Object.entries(pkg.dependencies ?? {})) {
                if (name === '@spacegraphjs/demo-domain') {
                    expect(range).toBe('workspace:*');
                    continue;
                }
                expect(range, `${path}: ${name}`).toMatch(/^\^?\d/);
            }
        }
    });

    it('declares the tools its scripts run', () => {
        const host = manifest('host/package.json');
        const domain = manifest('domain/package.json');
        const tools = ['vite', 'tsx', 'vitest', 'typescript', '@playwright/test'];
        for (const tool of tools) expect(host.devDependencies?.[tool]).toMatch(/^\^?\d/);
        expect(domain.devDependencies?.typescript).toMatch(/^\^?\d/);
        expect(host.scripts?.['verify:visual']).toContain('playwright');
    });
});
