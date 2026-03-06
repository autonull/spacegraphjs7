import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

export class AutoColorPlugin implements ISpaceGraphPlugin {
    readonly id = 'auto-color';
    readonly name = 'Auto Color';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    init(sg: SpaceGraph): void {
        this.sg = sg;
        console.log(`[AutoColorPlugin] Initialized ${this.name} v${this.version}`);
    }

    onPreRender(_delta: number): void {
        // This plugin will serve as a skeleton for AI vision color adjustments.
        // In the future, VisionManager will call methods on this plugin to auto-correct
        // color harmony and contrast issues.
    }

    // Helper: relative luminance per WCAG 2.x
    private getLuminance(r: number, g: number, b: number): number {
        const a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    // Calculate contrast ratio
    private getContrastRatio(l1: number, l2: number): number {
        const brightest = Math.max(l1, l2);
        const darkest = Math.min(l1, l2);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    // Find a compliant color by adjusting lightness
    private getCompliantColor(hexColor: number): number {
        let r = (hexColor >> 16) & 255;
        let g = (hexColor >> 8) & 255;
        let b = hexColor & 255;

        const textLuminance = this.getLuminance(255, 255, 255); // Assuming white text
        let currentLuminance = this.getLuminance(r, g, b);
        let ratio = this.getContrastRatio(currentLuminance, textLuminance);

        // Iteratively darken the color until it passes WCAG AA (4.5:1)
        let iterations = 0;
        while (ratio < 4.5 && iterations < 20) {
            r = Math.max(0, Math.floor(r * 0.9));
            g = Math.max(0, Math.floor(g * 0.9));
            b = Math.max(0, Math.floor(b * 0.9));

            currentLuminance = this.getLuminance(r, g, b);
            ratio = this.getContrastRatio(currentLuminance, textLuminance);
            iterations++;
        }

        // If we couldn't make it work by darkening, fallback to a standard high-contrast dark color
        if (ratio < 4.5) {
            return 0x333333; // Dark gray
        }

        return (r << 16) | (g << 8) | b;
    }

    public applyVisionCorrection(issues: any[]): void {
        console.log(`[AutoColorPlugin] Received ${issues.length} color vision issues to auto-fix.`);

        const colorIssues = issues.filter((i) => i.type === 'color' || i.type === 'legibility');

        if (colorIssues.length > 0) {
            console.log(
                `[AutoColorPlugin] Auto-fixing ${colorIssues.length} color/legibility issues...`,
            );

            for (const issue of colorIssues) {
                if (issue.nodeId) {
                    const node = this.sg.graph.nodes.get(issue.nodeId);
                    if (node) {
                        let newColor = 0xffffff;

                        if (issue.suggestedColor) {
                            newColor = issue.suggestedColor;
                        } else if (node.data && node.data.color !== undefined) {
                            // Find a mathematically compliant background color for the assumed white text
                            newColor = this.getCompliantColor(node.data.color);
                        }

                        console.log(
                            `[AutoColorPlugin] Fixing color for node ${issue.nodeId}. New color: 0x${newColor.toString(16)}`,
                        );
                        node.updateSpec({ data: { color: newColor } });
                    }
                }
            }
        }
    }

    dispose(): void {
        console.log(`[AutoColorPlugin] Disposing ${this.name}`);
    }
}
