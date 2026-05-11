// SpaceGraphJS - Legibility Analyzer
// WCAG contrast analysis for text and UI elements

import * as THREE from 'three';
import type { VisionContext } from '../types';
import type { LegibilityResult, ContrastFailure } from '../types';
import type { HeuristicsConfig } from '../strategies/HeuristicsStrategy';
import { getRelativeLuminance, getContrastRatio } from '../../utils/color';

/**
 * Legibility Analyzer
 * Checks WCAG contrast ratios for text and UI elements
 */
export class LegibilityAnalyzer {
    /**
     * Analyze legibility of nodes
     */
    async analyze(context: VisionContext, config: HeuristicsConfig): Promise<LegibilityResult> {
        const { failures, totalContrast, nodeCount } = context.nodes.reduce<{ failures: ContrastFailure[]; totalContrast: number; nodeCount: number }>(
            (acc, node) => {
                const result = this.analyzeNode(
                    node as {
                        id: string;
                        data: Record<string, unknown>;
                        object?: THREE.Object3D;
                    },
                );

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
            { failures: [] as ContrastFailure[], totalContrast: 0, nodeCount: 0 }
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
    private analyzeNode(node: {
        id: string;
        data: Record<string, unknown>;
        object?: THREE.Object3D;
    }): { nodeId: string; contrast: number } | null {
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
    private getNodeColor(node: {
        data: Record<string, unknown>;
        object?: THREE.Object3D;
    }): THREE.Color | null {
        // Try to get color from data
        const dataColor = node.data.color;
        if (typeof dataColor === 'string') {
            return new THREE.Color(dataColor);
        }
        if (typeof dataColor === 'number') {
            return new THREE.Color(dataColor);
        }

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
    private getBackgroundColor(node: { data: Record<string, unknown> }): THREE.Color | null {
        // Try to get from data
        const bgColor = (node.data as { backgroundColor?: string | number }).backgroundColor;
        if (bgColor !== undefined) {
            if (typeof bgColor === 'string') {
                return new THREE.Color(bgColor);
            }
            if (typeof bgColor === 'number') {
                return new THREE.Color(bgColor);
            }
        }

        // Default to dark background (SpaceGraphJS default)
        return new THREE.Color(0x1a1a2e);
    }
}
