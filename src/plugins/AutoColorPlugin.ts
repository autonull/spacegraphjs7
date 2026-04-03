import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AutoColorPlugin');

export class AutoColorPlugin implements ISpaceGraphPlugin {
    readonly id = 'auto-color';
    readonly name = 'Auto Color';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    init(sg: SpaceGraph): void {
        this.sg = sg;
        logger.info('Initialized %s v%s', this.name, this.version);
    }

    onPreRender(_delta: number): void {
        // Skeleton for AI vision color adjustments
    }

    private getLuminance(r: number, g: number, b: number): number {
        const a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    private getContrastRatio(l1: number, l2: number): number {
        const brightest = Math.max(l1, l2);
        const darkest = Math.min(l1, l2);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    private getCompliantColor(hexColor: number): number {
        let r = (hexColor >> 16) & 255;
        let g = (hexColor >> 8) & 255;
        let b = hexColor & 255;

        const textLuminance = this.getLuminance(255, 255, 255);
        let currentLuminance = this.getLuminance(r, g, b);
        let ratio = this.getContrastRatio(currentLuminance, textLuminance);

        let iterations = 0;
        while (ratio < 4.5 && iterations < 20) {
            r = Math.max(0, Math.floor(r * 0.9));
            g = Math.max(0, Math.floor(g * 0.9));
            b = Math.max(0, Math.floor(b * 0.9));

            currentLuminance = this.getLuminance(r, g, b);
            ratio = this.getContrastRatio(currentLuminance, textLuminance);
            iterations++;
        }

        if (ratio < 4.5) {
            return 0x333333;
        }

        return (r << 16) | (g << 8) | b;
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
                            newColor = this.getCompliantColor(node.data.color as number);
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
