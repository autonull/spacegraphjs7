import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';

export interface VisionCategory {
    type: 'layout' | 'legibility' | 'color' | 'overlap' | 'hierarchy' | 'ergonomics';
}

export interface VisionReport {
    layout: { overall: number; issues: any[] };
    legibility: { wcagCompliance: { AA: boolean }; failures: any[] };
    color: { harmonyScore: number; dominantPalette: string[] };
    overlap: { overlaps: any[]; statistics: { totalOverlaps: number } };
    hierarchy: { clarityScore: number };
    ergonomics: { fittsLawScore: number };
    overall: number;
}

export class VisionManager {
  private sg: SpaceGraph;
  private isAnalyzing: boolean = false;

  constructor(sg: SpaceGraph) {
    this.sg = sg;
  }

  public async loadModels(modelPaths: Record<string, string>): Promise<void> {
    console.log('[VisionManager] Placeholder: Model loading initialized with paths: ', modelPaths);
    // Placeholder for ONNX runtime model loading
  }

  public async analyzeVision(): Promise<VisionReport> {
    if (this.isAnalyzing) {
      throw new Error('[VisionManager] Analysis already in progress.');
    }

    this.isAnalyzing = true;
    console.log('[VisionManager] Starting automated visual analysis loop...');

    // Simulate Vision processing (LQ-Net, TLA, CHE, ODN, VHS, EQA)
    await new Promise(resolve => setTimeout(resolve, 50));

    // Basic heuristic checks to simulate actual Vision checks
    const nodes = Array.from(this.sg.graph.nodes.values());
    const overlaps = [];
    let layoutScore = 100;

    // Ambitious Overlap Detection using Bounding Boxes
    const camera = this.sg.renderer.camera;
    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        if (!frustum.containsPoint(nodeA.object.position)) continue;

        const boxA = new THREE.Box3().setFromObject(nodeA.object);

        // Expand the bounding box slightly to act as a buffer/padding
        boxA.expandByScalar(5);

        for (let j = i + 1; j < nodes.length; j++) {
            const nodeB = nodes[j];
            if (!frustum.containsPoint(nodeB.object.position)) continue;

            const boxB = new THREE.Box3().setFromObject(nodeB.object);
            boxB.expandByScalar(5);

            if (boxA.intersectsBox(boxB)) {
                overlaps.push({ nodeA: nodeA.id, nodeB: nodeB.id });
                layoutScore -= 10;
            }
        }
    }

    const mockReport: VisionReport = {
        layout: { overall: Math.max(0, layoutScore), issues: overlaps },
        legibility: { wcagCompliance: { AA: true }, failures: [] },
        color: { harmonyScore: 90, dominantPalette: ['#3366ff', '#ff6633'] },
        overlap: { overlaps: overlaps, statistics: { totalOverlaps: overlaps.length } },
        hierarchy: { clarityScore: 85 },
        ergonomics: { fittsLawScore: 90 },
        overall: Math.max(0, layoutScore - (overlaps.length * 2))
    };

    console.log('[VisionManager] Analysis complete. Overall Score:', mockReport.overall);

    // Simulate Vision-Closed self-correction trigger based on threshold
    if (mockReport.overall < 90) {
        console.warn('[VisionManager] Quality below threshold, triggering autonomous fix...');
        await this.autoFix({ type: 'overlap' }, mockReport);
    }

    this.isAnalyzing = false;
    return mockReport;
  }

  public async autoFix(category: VisionCategory, report?: VisionReport): Promise<void> {
      console.log(`[VisionManager] Triggering auto-fix for category: ${category.type}`);

      // Autonomous ODN (Overlap Detection Network) fix via AutoLayoutPlugin
      if (category.type === 'overlap' && report) {
          console.log('[VisionManager] Applying overlap corrections...');
          const autoLayoutPlugin: any = this.sg.pluginManager.getPlugin('AutoLayoutPlugin');

          if (autoLayoutPlugin && typeof autoLayoutPlugin.fixOverlaps === 'function') {
              // Pass the specific overlap issues to the AutoLayoutPlugin
              autoLayoutPlugin.fixOverlaps(report.overlap.overlaps);
              console.log('[VisionManager] AutoLayoutPlugin overlap corrections applied.');
          } else {
             // Fallback to force layout if AutoLayout is not available
             const forceLayout: any = this.sg.pluginManager.getPlugin('ForceLayout');
             if (forceLayout && typeof forceLayout.apply === 'function') {
                  console.log('[VisionManager] AutoLayoutPlugin not found, falling back to ForceLayout...');

                  // Temporarily increase distance and apply
                  const originalDistance = forceLayout.settings.nodeDistance || 100;
                  forceLayout.settings.nodeDistance = originalDistance * 1.5;
                  forceLayout.apply();

                  // Restore original settings after applying the force layout
                  setTimeout(() => {
                      forceLayout.settings.nodeDistance = originalDistance;
                  }, 500);
             } else {
                 console.warn('[VisionManager] No suitable layout plugin found to perform autoFix.');
             }
          }
      }
  }
}
