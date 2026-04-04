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
            logger.info('Vision analysis running on build output...');

            const report = await runVisionAnalysis('dist');
            logger.info('Vision Analysis Report:', report);

            if (options.thresholds?.layout && report.hierarchy.score < options.thresholds.layout) {
                logger.warn(
                    `Layout score (${report.hierarchy.score}) is below threshold (${options.thresholds.layout})`,
                );
            }

            if (
                options.thresholds?.legibility &&
                report.legibility.averageContrast < options.thresholds.legibility
            ) {
                logger.warn(
                    `Legibility score (${report.legibility.averageContrast}) is below threshold (${options.thresholds.legibility})`,
                );
            }

            if (options.autoFix && report.overall.issues.length > 0) {
                logger.info(
                    `AutoFix enabled: generating patch for ${report.overall.issues.length} issues...`,
                );

                const patches = report.overall.issues.map((issue) => {
                    const patch: Record<string, unknown> = {
                        targetNodeId: issue.nodeIds?.[0] ?? 'global',
                        action: 'update',
                    };

                    if (issue.message.includes('contrast')) {
                        patch.data = { color: '#ffffff' };
                    } else if (issue.message.includes('overlap') || issue.category === 'overlap') {
                        patch.position = 'auto-resolve-layout';
                    }

                    return {
                        issue: issue.category,
                        message: issue.message,
                        patch,
                    };
                });

                const fs = await import('fs');
                const path = await import('path');
                const patchPath = path.resolve(process.cwd(), 'spacegraph-autofix-patch.json');

                fs.writeFileSync(patchPath, JSON.stringify(patches, null, 2), 'utf-8');

                logger.info(`Generated JSON patch file at: ${patchPath}`);
                logger.info(`CI systems can consume this patch to mutate source data.`);
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
