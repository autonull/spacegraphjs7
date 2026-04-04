import type { SpaceGraph } from '../SpaceGraph.js';
import type { VisionReport } from '../../vision/types.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('VisionAutoFixer');

export interface VisionCategory {
    type: 'layout' | 'legibility' | 'color' | 'overlap' | 'hierarchy' | 'ergonomics';
}

export class VisionAutoFixer {
    private readonly sg: SpaceGraph;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    async autoFix(category: VisionCategory, report?: VisionReport): Promise<void> {
        logger.info('Triggering auto-fix for category: %s', category.type);
        if (!report) return;

        switch (category.type) {
            case 'legibility':
            case 'color':
                await this.fixLegibility(report);
                break;
            case 'overlap':
                await this.fixOverlap(report);
                break;
            case 'hierarchy':
                await this.fixHierarchy(report);
                break;
            case 'ergonomics':
                this.fixErgonomics();
                break;
            case 'layout':
                await this.fixLayout(report);
                break;
        }
    }

    private async fixLegibility(report: VisionReport): Promise<void> {
        const autoColorPlugin = this.sg.pluginManager.getPlugin('AutoColorPlugin');
        if (
            autoColorPlugin &&
            'applyVisionCorrection' in autoColorPlugin &&
            typeof autoColorPlugin.applyVisionCorrection === 'function'
        ) {
            autoColorPlugin.applyVisionCorrection(report.legibility.failures);
            logger.info('AutoColorPlugin corrections applied.');
        } else {
            logger.warn('AutoColorPlugin not found or missing applyVisionCorrection.');
        }
    }

    private async fixOverlap(report: VisionReport): Promise<void> {
        const autoLayoutPlugin = this.sg.pluginManager.getPlugin('AutoLayoutPlugin');
        if (
            autoLayoutPlugin &&
            'fixOverlaps' in autoLayoutPlugin &&
            typeof autoLayoutPlugin.fixOverlaps === 'function'
        ) {
            autoLayoutPlugin.fixOverlaps(report.overlap.overlaps);
            logger.info('AutoLayoutPlugin overlap corrections applied.');
            return;
        }

        const forceLayout = this.sg.pluginManager.getPlugin('ForceLayout');
        if (
            forceLayout &&
            'update' in forceLayout &&
            'settings' in forceLayout &&
            typeof forceLayout.update === 'function'
        ) {
            const layout = forceLayout as { settings: { repulsion?: number }; update(): void };
            const originalRepulsion = layout.settings.repulsion ?? 10000;
            layout.settings.repulsion = originalRepulsion * 5;
            for (let i = 0; i < 50; i++) {
                layout.update();
            }
            layout.settings.repulsion = originalRepulsion;
        } else {
            logger.warn('No suitable layout plugin found to perform autoFix.');
        }
    }

    private async fixHierarchy(_report: VisionReport): Promise<void> {
        const hierLayout = this.sg.pluginManager.getPlugin('HierarchicalLayout');
        if (hierLayout) {
            if ('fixHierarchy' in hierLayout && typeof hierLayout.fixHierarchy === 'function') {
                hierLayout.fixHierarchy();
            } else if ('apply' in hierLayout && typeof hierLayout.apply === 'function') {
                hierLayout.apply();
            }
        }
    }

    private fixErgonomics(): void {
        logger.info('Applying ergonomics corrections (camera zoom limit)...');
        this.sg.fitView(150, 2.0);
    }

    private async fixLayout(report: VisionReport): Promise<void> {
        const autoLayoutPlugin = this.sg.pluginManager.getPlugin('AutoLayoutPlugin');
        if (
            autoLayoutPlugin &&
            'applyVisionCorrection' in autoLayoutPlugin &&
            typeof autoLayoutPlugin.applyVisionCorrection === 'function'
        ) {
            const formattedIssues = report.overlap.overlaps.map(
                (o: { nodeA: string; nodeB: string }) => ({
                    type: 'overlap' as const,
                    nodeA: o.nodeA,
                    nodeB: o.nodeB,
                }),
            );
            autoLayoutPlugin.applyVisionCorrection(formattedIssues);
        }
    }
}
