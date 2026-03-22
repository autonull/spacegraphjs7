import type { Plugin } from 'vite';
import { runVisionAnalysis } from './analyzer';

export interface VisionPluginOptions {
    enabled?: boolean;
    autoFix?: boolean;
    thresholds?: {
        layout?: number;
        legibility?: number;
    };
}

export function spacegraphVision(options: VisionPluginOptions = {}): Plugin {
    return {
        name: 'spacegraph-vision',
        enforce: 'post',

        async closeBundle() {
            if (!options.enabled) return;
            console.log('👁️  Vision analysis running on build output...');

            const report = await runVisionAnalysis('dist');
            console.log('Vision Analysis Report:', report);

            if (options.thresholds?.layout && report.layoutScore < options.thresholds.layout) {
                console.warn(
                    `[WARNING] Layout score (${report.layoutScore}) is below threshold (${options.thresholds.layout})`,
                );
            }

            if (
                options.thresholds?.legibility &&
                report.legibilityScore < options.thresholds.legibility
            ) {
                console.warn(
                    `[WARNING] Legibility score (${report.legibilityScore}) is below threshold (${options.thresholds.legibility})`,
                );
            }

            if (options.autoFix && report.issues.length > 0) {
                console.log(
                    `👁️  AutoFix enabled: generating patch for ${report.issues.length} issues...`,
                );

                const patches = report.issues.map((issue: any) => {
                    // Generate a structural JSON patch based on the issue type
                    const patch: any = {
                        targetNodeId: issue.nodeId || issue.nodeA || 'global',
                        action: 'update',
                    };

                    if (issue.message && issue.message.includes('contrast')) {
                        patch.data = { color: '#ffffff' }; // baseline bright color suggestion
                    } else if (issue.message && issue.message.includes('overlap')) {
                        patch.position = 'auto-resolve-layout'; // Semantic instruction
                    } else if (issue.type === 'overlap') {
                        patch.position = 'auto-resolve-layout';
                    }

                    return {
                        issue: issue.type || 'unknown',
                        message: issue.message || 'No description',
                        patch,
                    };
                });

                const fs = await import('fs');
                const path = await import('path');
                const patchPath = path.resolve(process.cwd(), 'spacegraph-autofix-patch.json');

                fs.writeFileSync(patchPath, JSON.stringify(patches, null, 2), 'utf-8');

                console.log(`[AutoFix] Generated JSON patch file at: ${patchPath}`);
                console.log(`[AutoFix] CI systems can consume this patch to mutate source data.`);
            }
        },

        configureServer(server) {
            server.middlewares.use('/__vision', async (req, res) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            });
        },
    };
}
