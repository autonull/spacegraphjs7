// SpaceGraphJS v7.0 - Legibility Analyzer
// WCAG contrast analysis for text and UI elements

import * as THREE from 'three';
import type { VisionContext } from '../types';
import type { LegibilityResult, ContrastFailure } from '../types';
import type { HeuristicsConfig } from '../strategies/HeuristicsStrategy';

/**
 * Legibility Analyzer
 * Checks WCAG contrast ratios for text and UI elements
 */
export class LegibilityAnalyzer {
  /**
   * Analyze legibility of nodes
   */
  async analyze(
    context: VisionContext,
    config: HeuristicsConfig
  ): Promise<LegibilityResult> {
    const failures: ContrastFailure[] = [];
    let totalContrast = 0;
    let nodeCount = 0;

    for (const node of context.nodes) {
      const result = this.analyzeNode(node as {
        id: string;
        data: Record<string, unknown>;
        object?: THREE.Object3D;
      });

      if (result) {
        totalContrast += result.contrast;
        nodeCount++;

        if (result.contrast < config.wcagThreshold) {
          failures.push({
            nodeId: result.nodeId,
            contrast: result.contrast,
            severity: result.contrast < 3.0 ? 'error' : 'warning'
          });
        }
      }
    }

    const averageContrast = nodeCount > 0 ? totalContrast / nodeCount : 0;

    return {
      wcagAA: failures.length === 0,
      averageContrast,
      failures
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

    const contrast = this.computeContrastRatio(nodeColor, bgColor);

    return {
      nodeId: node.id,
      contrast
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
  private getBackgroundColor(node: {
    data: Record<string, unknown>;
  }): THREE.Color | null {
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

  /**
   * Compute WCAG contrast ratio
   * Formula: (L1 + 0.05) / (L2 + 0.05)
   * where L1 is lighter color luminance, L2 is darker
   */
  private computeContrastRatio(color1: THREE.Color, color2: THREE.Color): number {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get relative luminance per WCAG 2.1
   * https://www.w3.org/WAI/GL/wiki/Relative_luminance
   */
  private getRelativeLuminance(color: THREE.Color): number {
    const { r, g, b } = color;

    const rsRGB = r;
    const gsRGB = g;
    const bsRGB = b;

    const rLinear = rsRGB <= 0.03928
      ? rsRGB / 12.92
      : Math.pow((rsRGB + 0.055) / 1.055, 2.4);

    const gLinear = gsRGB <= 0.03928
      ? gsRGB / 12.92
      : Math.pow((gsRGB + 0.055) / 1.055, 2.4);

    const bLinear = bsRGB <= 0.03928
      ? bsRGB / 12.92
      : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }
}
