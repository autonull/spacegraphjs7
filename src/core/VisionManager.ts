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

    // Mocks for ONNX session to demonstrate architectural pattern
    private sessions: Record<string, any> = {};

    public async loadModels(modelPaths: Record<string, string>): Promise<void> {
        console.log('[VisionManager] Initializing ONNX session with: ', modelPaths);

        // In a real implementation:
        // import { InferenceSession } from 'onnxruntime-web';
        // for (const [key, path] of Object.entries(modelPaths)) {
        //     this.sessions[key] = await InferenceSession.create(path);
        // }

        // Mock simulation
        for (const key of Object.keys(modelPaths)) {
            this.sessions[key] = { status: 'loaded (mock)', path: modelPaths[key] };
        }
        console.log('[VisionManager] ONNX models loaded successfully', this.sessions);
    }

    public async analyzeVision(): Promise<VisionReport> {
        if (this.isAnalyzing) {
            throw new Error('[VisionManager] Analysis already in progress.');
        }

        this.isAnalyzing = true;
        console.log('[VisionManager] Starting automated visual analysis loop...');

        // Simulate ONNX Inference step if sessions are loaded
        if (Object.keys(this.sessions).length > 0) {
            console.log('[VisionManager] Running ONNX inference for Graph Vision...');
            // let results = await this.sessions['layout'].run({ input: graphTensor });
            await new Promise(resolve => setTimeout(resolve, 50));
        } else {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Heuristics baseline (fallback or parallel to ML predictions)
        const nodes = Array.from(this.sg.graph.nodes.values());
        const overlaps = [];
        let layoutScore = 100;

        // TLA & CHE analysis
        const legibilityFailures = [];
        let colorHarmonyScore = 100;
        const dominantPalette: string[] = [];
        let wcagAA = true;
        const bgColor = new THREE.Color(this.sg.renderer.scene.background as THREE.Color);

        // Helper: relative luminance per WCAG 2.x
        const getLuminance = (r: number, g: number, b: number) => {
            const a = [r, g, b].map(function (v) {
                v /= 255;
                return v <= 0.03928
                    ? v / 12.92
                    : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        }

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

            // --- Color and Legibility analysis (TLA/CHE) ---
            if (nodeA.data && nodeA.data.color !== undefined) {
                const nodeColor = new THREE.Color(nodeA.data.color);
                dominantPalette.push(`#${nodeColor.getHexString()}`);

                // Assuming text color is white (#ffffff) for calculation
                // We compare node background to text color (white)
                const nodeL1 = getLuminance(nodeColor.r * 255, nodeColor.g * 255, nodeColor.b * 255);
                const textL2 = getLuminance(255, 255, 255);

                const brightest = Math.max(nodeL1, textL2);
                const darkest = Math.min(nodeL1, textL2);
                const contrastRatio = (brightest + 0.05) / (darkest + 0.05);

                // WCAG AA requires a contrast ratio of at least 4.5:1 for normal text
                if (contrastRatio < 4.5) {
                    legibilityFailures.push({
                        type: 'legibility',
                        severity: 'error',
                        nodeId: nodeA.id,
                        message: `Poor contrast ratio (${contrastRatio.toFixed(2)}:1) for node ${nodeA.id}. Text may be illegible.`
                    });
                    wcagAA = false;
                    colorHarmonyScore -= 10;
                }
            }

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
            legibility: { wcagCompliance: { AA: wcagAA }, failures: legibilityFailures },
            color: { harmonyScore: Math.max(0, colorHarmonyScore), dominantPalette: [...new Set(dominantPalette)].slice(0, 5) },
            overlap: { overlaps: overlaps, statistics: { totalOverlaps: overlaps.length } },
            hierarchy: { clarityScore: 85 },
            ergonomics: { fittsLawScore: 90 },
            overall: Math.max(0, layoutScore - (overlaps.length * 2) - (legibilityFailures.length * 5))
        };

        console.log('[VisionManager] Analysis complete. Overall Score:', mockReport.overall);

        // Simulate Vision-Closed self-correction trigger based on threshold
        if (mockReport.overall < 90) {
            console.warn('[VisionManager] Quality below threshold, triggering autonomous fix...');
            if (overlaps.length > 0) {
                await this.autoFix({ type: 'overlap' }, mockReport);
            }
            if (legibilityFailures.length > 0) {
                await this.autoFix({ type: 'legibility' }, mockReport);
            }
        }

        this.isAnalyzing = false;
        return mockReport;
    }

    public async autoFix(category: VisionCategory, report?: VisionReport): Promise<void> {
        console.log(`[VisionManager] Triggering auto-fix for category: ${category.type}`);

        // Autonomous Legibility / Color fix via AutoColorPlugin
        if ((category.type === 'legibility' || category.type === 'color') && report) {
            console.log('[VisionManager] Applying color/legibility corrections...');
            const autoColorPlugin: any = this.sg.pluginManager.getPlugin('AutoColorPlugin');

            if (autoColorPlugin && typeof autoColorPlugin.applyVisionCorrection === 'function') {
                autoColorPlugin.applyVisionCorrection(report.legibility.failures);
                console.log('[VisionManager] AutoColorPlugin corrections applied.');
            } else {
                console.warn('[VisionManager] AutoColorPlugin not found or missing applyVisionCorrection.');
            }
        }

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
                if (forceLayout && typeof forceLayout.update === 'function') {
                    console.log('[VisionManager] AutoLayoutPlugin not found, falling back to ForceLayout...');

                    // Temporarily increase distance and apply
                    const originalRepulsion = forceLayout.settings.repulsion || 10000;
                    forceLayout.settings.repulsion = originalRepulsion * 5;

                    for (let i = 0; i < 50; i++) {
                        forceLayout.update();
                    }

                    // Restore original settings after applying the force layout
                    forceLayout.settings.repulsion = originalRepulsion;
                } else {
                    console.warn('[VisionManager] No suitable layout plugin found to perform autoFix.');
                }
            }
        }
    }
}
