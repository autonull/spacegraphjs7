import { BaseSystemPlugin } from './BaseSystemPlugin';
import { createLogger } from '../utils/logger';
import { getCompliantColor } from '../utils/color';

const logger = createLogger('AutoColorPlugin');

export class AutoColorPlugin extends BaseSystemPlugin {
    readonly id = 'auto-color';
    readonly name = 'Auto Color';
    readonly version = '1.0.0';

    init(sg: SpaceGraph, graph: Graph, events: EventSystem): void {
        super.init(sg, graph, events);
        logger.info('Initialized %s v%s', this.name, this.version);
    }

    onPreRender(_delta: number): void {
        // Skeleton for AI vision color adjustments
    }

    public applyVisionCorrection(issues: unknown[]): void {
        logger.info('Received %d color vision issues to auto-fix.', issues.length);

        const colorIssues = issues.filter(
            (i: any) => i.type === 'color' || i.type === 'legibility',
        ) as Array<{ type: string; nodeId?: string; suggestedColor?: number }>;

        if (colorIssues.length > 0) {
            logger.info('Auto-fixing %d color/legibility issues...', colorIssues.length);

            for (const issue of colorIssues) {
                if (issue.nodeId) {
                    const node = this.sg.graph.nodes.get(issue.nodeId);
                    if (node) {
                        let newColor = 0xffffff;

                        if (issue.suggestedColor) {
                            newColor = issue.suggestedColor;
                        } else if (node.data && node.data.color !== undefined) {
                            newColor = getCompliantColor(node.data.color as number);
                        }

                        logger.info(
                            'Fixing color for node %s. New color: 0x%s',
                            issue.nodeId,
                            newColor.toString(16),
                        );
                        node.updateSpec({ data: { color: newColor } });
                    }
                }
            }
        }
    }

    dispose(): void {
        logger.info('Disposing %s', this.name);
    }
}
