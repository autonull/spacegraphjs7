// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Vision-CLI Integration', () => {
    it('reads a generated patch in dry-run mode', () => {
        const cwd = mkdtempSync(join(tmpdir(), 'sg-vision-'));
        try {
            writeFileSync(
                join(cwd, 'spacegraph-autofix-patch.json'),
                JSON.stringify({
                    fixes: [
                        {
                            type: 'overlap',
                            message: 'Overlap detected',
                            targetFile: 'test.html',
                            patch: { targetNodeId: 'node-1', action: 'update', position: 'auto' },
                        },
                    ],
                    generatedAt: new Date().toISOString(),
                    reportScore: 85,
                }),
            );
            const built = join(process.cwd(), 'packages/cli/dist/bin/sg.js');
            const args = existsSync(built)
                ? [built, 'fix', '--dry-run']
                : [
                      join(process.cwd(), 'node_modules/tsx/dist/cli.mjs'),
                      join(process.cwd(), 'packages/cli/bin/sg.ts'),
                      'fix',
                      '--dry-run',
                  ];
            const output = execFileSync(process.execPath, args, { cwd }).toString();
            expect(output).toMatch(/Found 1 visual regression/);
            expect(output).toMatch(/\[OVERLAP\]/);
            expect(output).toMatch(/Overlap detected/);
            expect(output).toMatch(/Location: test\.html/);
            expect(output).toMatch(/Dry-run: review only/);
            expect(output).toMatch(/Patch preserved at .*spacegraph-autofix-patch\.json/);
        } finally {
            rmSync(cwd, { recursive: true, force: true });
        }
    });
});
