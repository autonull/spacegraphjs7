import type { Plugin } from 'vite';
import { runVisionAnalysis } from './analyzer';
import { createLogger } from '../utils/logger';

const logger = createLogger('VisionPlugin');

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
            logger.log('Vision analysis running on build output...');

            const report = await runVisionAnalysis('dist');
            logger.log('Vision Analysis Report:', report);

            if (options.thresholds?.layout && report.layoutScore < options.thresholds.layout) {
                logger.warn(
                    `Layout score (${report.layoutScore}) is below threshold (${options.thresholds.layout})`,
                );
            }

            if (
                options.thresholds?.legibility &&
                report.legibilityScore < options.thresholds.legibility
            ) {
                logger.warn(
                    `Legibility score (${report.legibilityScore}) is below threshold (${options.thresholds.legibility})`,
                );
            }

            if (options.autoFix && report.issues.length > 0) {
                logger.log(
                    `AutoFix enabled: generating patch for ${report.issues.length} issues...`,
                );

                const patches = report.issues.map((issue: any) => {
                    const patch: any = {
                        targetNodeId: issue.nodeId || issue.nodeA || 'global',
                        action: 'update',
                    };

                    if (issue.message && issue.message.includes('contrast')) {
                        patch.data = { color: '#ffffff' };
                    } else if (issue.message && issue.message.includes('overlap')) {
                        patch.position = 'auto-resolve-layout';
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

                logger.log(`Generated JSON patch file at: ${patchPath}`);
                logger.log(`CI systems can consume this patch to mutate source data.`);
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
