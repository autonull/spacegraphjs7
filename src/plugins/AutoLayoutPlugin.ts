import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import type { ForceLayout } from './ForceLayout';
import type { Node } from '../nodes/Node';
import { createLogger } from '../utils/logger';

const logger = createLogger('AutoLayoutPlugin');

interface VisionIssue {
    type: 'overlap' | 'legibility' | 'color';
    nodeA?: string;
    nodeB?: string;
    nodeId?: string;
}

export class AutoLayoutPlugin implements ISpaceGraphPlugin {
    readonly id = 'auto-layout';
    readonly name = 'Auto Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    init(sg: SpaceGraph): void {
        this.sg = sg;
        logger.debug(`Initialized ${this.name} v${this.version}`);
    }

    onPreRender(_delta: number): void {
        // This plugin will serve as a skeleton for AI vision layout adjustments.
        // In the future, VisionManager will call methods on this plugin to auto-correct
        // overlapping nodes and poor visual groupings.
    }

    public applyVisionCorrection(issues: VisionIssue[]): void {
        logger.debug(`Received ${issues.length} vision issues to auto-fix.`);
        const overlapIssues = issues.filter((i) => i.type === 'overlap');
        if (overlapIssues.length > 0) {
            this.fixOverlaps(overlapIssues);
        }
    }

    public fixOverlaps(overlaps: VisionIssue[]): void {
        logger.debug(`Auto-fixing ${overlaps.length} overlaps...`);
        const layoutPlugin = this.sg.pluginManager.getPlugin('ForceLayout') as
            | ForceLayout
            | undefined;

        if (layoutPlugin && typeof (layoutPlugin as any).step === 'function') {
            const originalRepulsion = (layoutPlugin as any).config?.repulsion ?? 10000;
            (layoutPlugin as any).config.repulsion = originalRepulsion * 5;

            for (let i = 0; i < 50; i++) {
                (layoutPlugin as any).step();
            }

            (layoutPlugin as any).config.repulsion = originalRepulsion;
        } else {
            for (const issue of overlaps) {
                this.fixSingleOverlap(issue);
            }
        }
    }

    private fixSingleOverlap(issue: VisionIssue): void {
        if (!issue.nodeA || !issue.nodeB) return;

        const nodeA = this.sg.graph.nodes.get(issue.nodeA);
        const nodeB = this.sg.graph.nodes.get(issue.nodeB);

        if (nodeA && nodeB && nodeA.object && nodeB.object) {
            const dir = nodeB.position.clone().sub(nodeA.position);
            if (dir.lengthSq() < 0.01) {
                dir.set(Math.random() - 0.5, Math.random() - 0.5, 0);
            }

            dir.normalize().multiplyScalar(30);
            nodeB.position.add(dir);
            nodeA.position.sub(dir);
            nodeA.object.position.copy(nodeA.position);
            nodeB.object.position.copy(nodeB.position);
        }
    }

    dispose(): void {
        logger.debug(`Disposing ${this.name}`);
    }
}
