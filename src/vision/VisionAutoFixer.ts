import type { SpaceGraph } from '../SpaceGraph';
import { createLogger } from '../utils/logger';
import { hasMethod } from '../utils/record';
import type { VisionReport } from './types';

const logger = createLogger('VisionAutoFixer');

export interface VisionCategory {
    type: 'layout' | 'legibility' | 'color' | 'overlap' | 'hierarchy' | 'ergonomics';
}

export class VisionAutoFixer {
    readonly sg: SpaceGraph;

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
        const autoColorPlugin = this.sg.pluginManager.get('AutoColorPlugin');
        if (hasMethod(autoColorPlugin, 'applyVisionCorrection')) {
            autoColorPlugin.applyVisionCorrection(report.legibility.failures);
            logger.info('AutoColorPlugin corrections applied.');
        } else {
            logger.warn('AutoColorPlugin not found or missing applyVisionCorrection.');
        }
    }

    private async fixOverlap(report: VisionReport): Promise<void> {
        const autoLayoutPlugin = this.sg.pluginManager.get('AutoLayoutPlugin');
        if (hasMethod(autoLayoutPlugin, 'fixOverlaps')) {
            autoLayoutPlugin.fixOverlaps(report.overlap.overlaps);
            logger.info('AutoLayoutPlugin overlap corrections applied.');
            return;
        }

        logger.warn('No suitable layout plugin found to perform autoFix.');
    }

    private async fixHierarchy(_report: VisionReport): Promise<void> {
        const hierLayout = this.sg.pluginManager.get('HierarchicalLayout');
        if (hierLayout) {
            if (hasMethod(hierLayout, 'fixHierarchy')) {
                hierLayout.fixHierarchy();
            } else if (hasMethod(hierLayout, 'apply')) {
                hierLayout.apply();
            }
        }
    }

    private fixErgonomics(): void {
        logger.info('Applying ergonomics corrections (camera zoom limit)...');
        this.sg.fitView(150, 2.0);
    }

    private async fixLayout(report: VisionReport): Promise<void> {
        await this.fixOverlap(report);
    }
}
