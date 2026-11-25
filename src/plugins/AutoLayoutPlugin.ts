import { createLogger } from '../utils/logger';
import { BaseSystemPlugin } from './BaseSystemPlugin';

const logger = createLogger('AutoLayoutPlugin');

interface VisionIssue {
    type: 'overlap' | 'legibility' | 'color';
    nodeA?: string;
    nodeB?: string;
    nodeId?: string;
}

export class AutoLayoutPlugin extends BaseSystemPlugin {
    readonly id = 'auto-layout';
    readonly name = 'Auto Layout';

    protected onInit(): void {
        logger.debug(`Initialized ${this.name} v${this.version}`);
    }

    onPreRender(_delta: number): void {}

    public applyVisionCorrection(issues: VisionIssue[]): void {
        logger.debug(`Received ${issues.length} vision issues to auto-fix.`);
        const overlapIssues = issues.filter((i) => i.type === 'overlap');
        if (overlapIssues.length > 0) {
            this.fixOverlaps(overlapIssues);
        }
    }

    public fixOverlaps(overlaps: VisionIssue[]): void {
        logger.debug(`Auto-fixing ${overlaps.length} overlaps...`);
        for (const issue of overlaps) this.fixSingleOverlap(issue);
    }

    dispose(): void {
        logger.debug(`Disposing ${this.name}`);
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
}
