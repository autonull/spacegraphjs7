import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Vision-CLI Integration', () => {
    it('should generate a patch and be readable by the CLI', () => {
        const patchPath = path.resolve(process.cwd(), 'spacegraph-autofix-patch.json');

        // 1. Mock a patch file
        const mockPatch = {
            fixes: [
                {
                    type: 'overlap',
                    message: 'Overlap detected',
                    targetFile: 'test.html',
                    patch: { targetNodeId: 'node-1', action: 'update', position: 'auto' }
                }
            ],
            generatedAt: new Date().toISOString(),
            reportScore: 85
        };

        fs.writeFileSync(patchPath, JSON.stringify(mockPatch, null, 2));

        try {
            // 2. Run CLI in dry-run mode and capture output
            // We use the built JS file if it exists, otherwise we can try tsx
            const cliPath = path.resolve(process.cwd(), 'packages/cli/dist/bin/sg.js');
            const cmd = fs.existsSync(cliPath)
                ? `node ${cliPath} fix --dry-run`
                : `npx tsx packages/cli/bin/sg.ts fix --dry-run`;

            const output = execSync(cmd).toString();

            // 3. Verify output contains expected data
            expect(output).toContain('🚨 Found 1 visual regression');
            expect(output).toContain('[OVERLAP]');
            expect(output).toContain('Overlap detected');
            expect(output).toContain('Location: test.html');
            expect(output).toContain('Dry-run enabled');

        } finally {
            // Cleanup
            if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath);
        }
    });
});
