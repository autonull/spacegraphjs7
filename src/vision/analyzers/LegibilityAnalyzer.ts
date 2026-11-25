// SpaceGraphJS - Legibility Analyzer
// WCAG contrast analysis for text and UI elements

import type { HeuristicsConfig } from '..';
import * as THREE from 'three';
import { getContrastRatio, getRelativeLuminance } from '../../utils/color';
import type { ContrastFailure, LegibilityResult, VisionContext } from '../types';

type ColorNode = {
    id: string;
    data: Record<string, unknown>;
    object?: THREE.Object3D;
};

/**
 * Legibility Analyzer
 * Checks WCAG contrast ratios for text and UI elements
 */
export class LegibilityAnalyzer {
    /**
     * Analyze legibility of nodes
     */
    async analyze(context: VisionContext, config: HeuristicsConfig): Promise<LegibilityResult> {
        const { failures, totalContrast, nodeCount } = context.nodes.reduce<{
            failures: ContrastFailure[];
            totalContrast: number;
            nodeCount: number;
        }>(
            (acc, node) => {
                const result = this.analyzeNode(node as ColorNode);

                if (result) {
                    acc.totalContrast += result.contrast;
                    acc.nodeCount++;

                    if (result.contrast < config.wcagThreshold) {
                        acc.failures.push({
                            nodeId: result.nodeId,
                            contrast: result.contrast,
                            severity: result.contrast < 3.0 ? 'error' : 'warning',
                        });
                    }
                }
                return acc;
            },
            { failures: [] as ContrastFailure[], totalContrast: 0, nodeCount: 0 },
        );

        const averageContrast = nodeCount > 0 ? totalContrast / nodeCount : 0;

        return {
            wcagAA: failures.length === 0,
            averageContrast,
            failures,
        };
    }

    /**
     * Analyze a single node's legibility
     */
    private analyzeNode(node: ColorNode): { nodeId: string; contrast: number } | null {
        const nodeColor = this.getNodeColor(node);
        const bgColor = this.getBackgroundColor(node);

        if (!nodeColor || !bgColor) return null;

        const contrast = getContrastRatio(
            getRelativeLuminance(nodeColor),
            getRelativeLuminance(bgColor),
        );

        return {
            nodeId: node.id,
            contrast,
        };
    }

    /**
     * Get node's foreground color
     */
    private getNodeColor(node: ColorNode): THREE.Color | null {
        // HTML nodes render their text with an inline style; the node box colour is a neutral
        // surface and would report a false contrast failure.
        const style = node.data.style as Record<string, unknown> | undefined;
        if (typeof style?.color === 'string') return new THREE.Color(style.color);

        // Try to get color from data
        const dataColor = node.data.color;
        if (typeof dataColor === 'string' || typeof dataColor === 'number')
            return new THREE.Color(dataColor);

        // Try to get color from material
        if (node.object) {
            const material = (node.object as THREE.Mesh).material;
            if (material && 'color' in material && material.color instanceof THREE.Color) {
                return material.color.clone();
            }
        }

        // Default to white
        return new THREE.Color(0xffffff);
    }

    /**
     * Get background color
     */
    private getBackgroundColor(node: Pick<ColorNode, 'data'>): THREE.Color | null {
        const style = node.data.style as Record<string, unknown> | undefined;
        if (typeof style?.backgroundColor === 'string') return new THREE.Color(style.backgroundColor);
        // Try to get from data
        const bgColor = (node.data as { backgroundColor?: string | number }).backgroundColor;
        if (typeof bgColor === 'string' || typeof bgColor === 'number')
            return new THREE.Color(bgColor);

        // Default to dark background (SpaceGraphJS default)
        return new THREE.Color(0x1a1a2e);
    }
}
