import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import { InferenceSession, Tensor, env } from 'onnxruntime-web';
import { getLuminance, hexToRgb } from '../utils/color.js';
import { SpatialIndex } from './SpatialIndex';

// Configure ONNX to fetch WASM payload from unpkg/jsdelivr instead of requiring local bundling logic
env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

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
    private autonomousTimer: any | null = null;
    private spatialIndex: SpatialIndex = new SpatialIndex(50); // 50 units cell size

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    // Holds actual ONNX runtime sessions
    private sessions: Record<string, InferenceSession> = {};

    public async loadModels(modelPaths: Record<string, string>): Promise<void> {
        console.log('[VisionManager] Initializing ONNX session with: ', modelPaths);

        for (const [key, path] of Object.entries(modelPaths)) {
            try {
                this.sessions[key] = await InferenceSession.create(path, {
                    executionProviders: ['wasm'],
                });
                console.log(`[VisionManager] Loaded ${key} ONNX model from ${path}`);
            } catch (err) {
                console.error(`[VisionManager] Failed to load ONNX model ${key}:`, err);
            }
        }
        console.log('[VisionManager] ONNX models loaded.', Object.keys(this.sessions));
    }

    public async analyzeVision(): Promise<VisionReport> {
        if (this.isAnalyzing) {
            throw new Error('[VisionManager] Analysis already in progress.');
        }

        this.isAnalyzing = true;
        console.log('[VisionManager] Starting automated visual analysis loop...');

        // Execute ONNX Inference logic for vision components
        if (Object.keys(this.sessions).length > 0) {
            console.log('[VisionManager] Running ONNX inference for Graph Vision...');
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
        const bgColorThree = new THREE.Color(this.sg.renderer.scene.background as THREE.Color);
        const bgColor = {
            r: bgColorThree.r * 255,
            g: bgColorThree.g * 255,
            b: bgColorThree.b * 255,
        };

        // Ambitious Overlap Detection using Bounding Boxes
        const camera = this.sg.renderer.camera;
        const frustum = new THREE.Frustum();
        const cameraViewProjectionMatrix = new THREE.Matrix4();
        camera.updateMatrixWorld();
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        cameraViewProjectionMatrix.multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse,
        );
        frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

        // Build Spatial Index for O(n log n) overlap queries
        this.spatialIndex.build(nodes);

        for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i];

            // --- Color and Legibility analysis (TLA/CHE) ---
            // Generate some random layout heuristics if the ONNX model isn't driving
            const nodeColor = nodeA.data?.color
                ? hexToRgb(nodeA.data.color)
                : { r: 200, g: 200, b: 200 };
            dominantPalette.push(nodeA.data?.color || '#cccccc');

            // Math-based heuristic for legibility (WCAG contrast)
            if (nodeColor) {
                const nodeL1 = getLuminance(nodeColor.r, nodeColor.g, nodeColor.b);
                const textL2 = getLuminance(255, 255, 255);

                const brightest = Math.max(nodeL1, textL2);
                const darkest = Math.min(nodeL1, textL2);
                const contrastRatio = (brightest + 0.05) / (darkest + 0.05);

                // WCAG AA requires a contrast ratio of at least 4.5:1 for normal text
                let verifiedIssue = false;
                if (contrastRatio < 4.5) {
                    verifiedIssue = true; // Math confirms it's an issue

                    // TLA (Text Legibility Analysis) verification step
                    if (this.sessions['tla']) {
                        try {
                            const inputs = new Float32Array([
                                nodeColor.r / 255,
                                nodeColor.g / 255,
                                nodeColor.b / 255,
                                1.0,
                                1.0,
                                1.0, // Assumed white text
                                14.0,
                                400.0, // Assumed size and weight
                            ]);
                            const tensor = new Tensor('float32', inputs, [1, 8]);
                            const result = await this.sessions['tla'].run({
                                text_features: tensor,
                            });
                            const prob = result['legibility_score'].data[0] as number;

                            // If neural net thinks it's legible (prob > 0.5), ignore the math heuristic
                            if (prob >= 0.5) {
                                verifiedIssue = false;
                            }
                        } catch (e) {
                            console.error('[VisionManager] TLA model inference failed', e);
                        }
                    }

                    // CHE (Color Harmony Evaluation) step
                    if (this.sessions['che'] && verifiedIssue) {
                        try {
                            const inputs = new Float32Array([
                                nodeColor.r / 255,
                                nodeColor.g / 255,
                                nodeColor.b / 255,
                                bgColor.r / 255,
                                bgColor.g / 255,
                                bgColor.b / 255,
                                0.5,
                                0.5,
                                0.5, // Simulated neighborhood average
                            ]);
                            const tensor = new Tensor('float32', inputs, [1, 9]);
                            const result = await this.sessions['che'].run({
                                color_neighborhood: tensor,
                            });
                            const prob = result['harmony_score'].data[0] as number;

                            if (prob < 0.5) {
                                colorHarmonyScore -= 10;
                            }
                        } catch (e) {
                            console.error('[VisionManager] CHE model inference failed', e);
                        }
                    }
                }

                if (verifiedIssue) {
                    legibilityFailures.push({
                        type: 'legibility',
                        severity: 'error',
                        nodeId: nodeA.id,
                        message: `Poor contrast ratio (${contrastRatio.toFixed(2)}:1) for node ${nodeA.id}. Text may be illegible.`,
                    });
                    wcagAA = false;
                }
            }

            if (!frustum.containsPoint(nodeA.object.position)) continue;

            const boxA = new THREE.Box3().setFromObject(nodeA.object);

            // Expand the bounding box slightly to act as a buffer/padding
            boxA.expandByScalar(5);

            // Query spatial index for neighbors
            const neighbors = this.spatialIndex.queryBox(boxA);

            for (const nodeB of neighbors) {
                if (nodeA.id === nodeB.id) continue;

                // Keep ordering alphabetical to avoid double counting A->B and B->A
                if (nodeB.id < nodeA.id) continue;

                if (!frustum.containsPoint(nodeB.object.position)) continue;

                const boxB = new THREE.Box3().setFromObject(nodeB.object);
                boxB.expandByScalar(5);

                // First run the mathematical heuristic overlap box check
                if (boxA.intersectsBox(boxB)) {
                    // ODN verification step: If the math check says they intersect, we verify with our Neural Network
                    let verifiedOverlap = true;
                    if (this.sessions['odn']) {
                        try {
                            // Extract bounding boxes details to format as [x1, y1, x2, y2, x1, y1, x2, y2]
                            const inputs = new Float32Array([
                                boxA.min.x,
                                boxA.min.y,
                                boxA.max.x,
                                boxA.max.y,
                                boxB.min.x,
                                boxB.min.y,
                                boxB.max.x,
                                boxB.max.y,
                            ]);
                            const tensor = new Tensor('float32', inputs, [1, 8]);
                            const result = await this.sessions['odn'].run({ boxes: tensor });

                            // Get probability from output tensor
                            const prob = result['overlap_prob'].data[0] as number;
                            // If neural net probability < 0.5, we override the math check
                            if (prob < 0.5) {
                                verifiedOverlap = false;
                            }
                        } catch (e) {
                            console.error('[VisionManager] ODN model inference failed', e);
                        }
                    }

                    if (verifiedOverlap) {
                        overlaps.push({ nodeA: nodeA.id, nodeB: nodeB.id });
                        layoutScore -= 10;
                    }
                }
            }
        }

        // --- VHS: Visual Hierarchy Scoring ---
        let clarityScore = 85;
        const inDegrees = new Map<string, number>();
        nodes.forEach((n) => inDegrees.set(n.id, 0));
        this.sg.graph.edges.forEach((e) => {
            if (e.target && e.target.id) {
                inDegrees.set(e.target.id, (inDegrees.get(e.target.id) || 0) + 1);
            }
        });

        // BFS to find max depth and distribution
        let maxDepth = 0;
        const queue: { id: string; depth: number }[] = [];
        inDegrees.forEach((deg, id) => {
            if (deg === 0) queue.push({ id, depth: 0 });
        });

        const depths: number[] = [];
        while (queue.length > 0) {
            const current = queue.shift()!;
            maxDepth = Math.max(maxDepth, current.depth);
            depths.push(current.depth);

            // push children (simplified)
            for (const edge of this.sg.graph.edges) {
                if (edge.source.id === current.id) {
                    queue.push({ id: edge.target.id, depth: current.depth + 1 });
                }
            }
        }

        if (this.sessions['vhs'] && depths.length > 0) {
            try {
                // Feature vector: [avg_depth, max_depth, node_count, edge_count]
                const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
                const inputs = new Float32Array([
                    avgDepth,
                    maxDepth,
                    nodes.length,
                    this.sg.graph.edges.length,
                ]);
                const tensor = new Tensor('float32', inputs, [1, 4]);
                const result = await this.sessions['vhs'].run({ hierarchy_features: tensor });
                clarityScore = Math.floor((result['hierarchy_score'].data[0] as number) * 100);
            } catch (e) {
                console.error('[VisionManager] VHS model inference failed', e);
            }
        }

        // --- EQA: Ergonomics Quality Assessment (Fitts' Law Proxy) ---
        let fittsLawScore = 90;
        let smallTargets = 0;

        // Approximate pixel sizes
        const screenWidth = this.sg.renderer.renderer.domElement.width;
        const screenHeight = this.sg.renderer.renderer.domElement.height;

        for (const node of nodes) {
            if (!frustum.containsPoint(node.object.position)) continue;

            // Ensure node coordinates project to screen appropriately, ignoring result for now
            node.object.position.clone().project(camera);

            // To find bounding box size on screen, we convert node's box corners
            const box = new THREE.Box3().setFromObject(node.object);
            const size = new THREE.Vector3();
            box.getSize(size);

            // A crude heuristic for screen size estimation (distance scaling)
            const distance = camera.position.distanceTo(node.object.position);
            const apparentSize = (Math.max(size.x, size.y) / distance) * screenHeight;

            // Fitts law suggests target sizes < 44px (Apple guidelines) are hard to click
            if (apparentSize < 44) smallTargets++;
        }

        const pctSmall = nodes.length > 0 ? smallTargets / nodes.length : 0;

        if (this.sessions['eqa']) {
            try {
                // Feature vector: [pct_small_targets, total_nodes, screen_width, screen_height]
                const inputs = new Float32Array([
                    pctSmall,
                    nodes.length,
                    screenWidth,
                    screenHeight,
                ]);
                const tensor = new Tensor('float32', inputs, [1, 4]);
                const result = await this.sessions['eqa'].run({ ergonomic_features: tensor });
                fittsLawScore = Math.floor((result['fittslaw_score'].data[0] as number) * 100);
            } catch (e) {
                console.error('[VisionManager] EQA model inference failed', e);
            }
        } else {
            fittsLawScore = Math.max(0, 100 - pctSmall * 100);
        }

        const mockReport: VisionReport = {
            layout: { overall: Math.max(0, layoutScore), issues: overlaps },
            legibility: { wcagCompliance: { AA: wcagAA }, failures: legibilityFailures },
            color: {
                harmonyScore: Math.max(0, colorHarmonyScore),
                dominantPalette: [...new Set(dominantPalette)].slice(0, 5),
            },
            overlap: { overlaps: overlaps, statistics: { totalOverlaps: overlaps.length } },
            hierarchy: { clarityScore: Math.max(0, clarityScore) },
            ergonomics: { fittsLawScore: Math.max(0, fittsLawScore) },
            overall: Math.max(
                0,
                layoutScore -
                overlaps.length * 2 -
                legibilityFailures.length * 5 -
                (100 - clarityScore) * 0.5 -
                (100 - fittsLawScore) * 0.5,
            ),
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
            if (clarityScore < 60) {
                await this.autoFix({ type: 'hierarchy' }, mockReport);
            }
            if (fittsLawScore < 60) {
                await this.autoFix({ type: 'ergonomics' }, mockReport);
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
                console.warn(
                    '[VisionManager] AutoColorPlugin not found or missing applyVisionCorrection.',
                );
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
                    console.log(
                        '[VisionManager] AutoLayoutPlugin not found, falling back to ForceLayout...',
                    );

                    // Temporarily increase distance and apply
                    const originalRepulsion = forceLayout.settings.repulsion || 10000;
                    forceLayout.settings.repulsion = originalRepulsion * 5;

                    for (let i = 0; i < 50; i++) {
                        forceLayout.update();
                    }

                    // Restore original settings after applying the force layout
                    forceLayout.settings.repulsion = originalRepulsion;
                } else {
                    console.warn(
                        '[VisionManager] No suitable layout plugin found to perform autoFix.',
                    );
                }
            }
        }

        // Autonomous Hierarchy fix via HierarchicalLayout
        if (category.type === 'hierarchy' && report) {
            console.log('[VisionManager] Applying hierarchy corrections...');
            const hierLayout: any = this.sg.pluginManager.getPlugin('HierarchicalLayout');
            if (hierLayout && typeof hierLayout.fixHierarchy === 'function') {
                hierLayout.fixHierarchy();
            } else if (hierLayout && typeof hierLayout.apply === 'function') {
                // Just force a re-layout
                hierLayout.apply();
            }
        }

        // Autonomous Ergonomics fix via Camera scale
        if (category.type === 'ergonomics' && report) {
            console.log('[VisionManager] Applying ergonomics corrections (camera zoom limit)...');
            // Usually we might constrain the camera from zooming out too far, or we scale up key nodes.
            this.sg.fitView(150, 2.0); // Simple auto-zoom
        }
    }

    /**
     * The Vision-Closed loop: periodically analyzes the view and triggers
     * plugins to correct aesthetic/layout issues autonomously.
     */
    public startAutonomousCorrection(intervalMs: number = 30000): void {
        if (this.autonomousTimer) {
            this.stopAutonomousCorrection();
        }

        console.log(
            `[VisionManager] Starting autonomous correction loop (interval: ${intervalMs}ms)`,
        );

        this.autonomousTimer = setInterval(async () => {
            try {
                const report = await this.analyzeVision();

                // If overlaps exist, trigger AutoLayoutPlugin to fix them
                if (report.overlap.overlaps.length > 0) {
                    const autoLayout = this.sg.pluginManager.getPlugin('auto-layout') as any;
                    if (autoLayout && typeof autoLayout.applyVisionCorrection === 'function') {
                        // Pass simulated 'overlap' typed issues to the plugin
                        const formattedIssues = report.overlap.overlaps.map((o) => ({
                            type: 'overlap',
                            nodeA: o.nodeA,
                            nodeB: o.nodeB,
                        }));
                        autoLayout.applyVisionCorrection(formattedIssues);
                    }
                }
            } catch (err) {
                console.error('[VisionManager] Autonomous loop error: ', err);
            }
        }, intervalMs);
    }

    /**
     * Imperatively triggers auto-fixes for all failing categories in a given report.
     * This orchestrates the underlying `autoFix` pipeline.
     */
    public async applyAutonomousFixes(report: VisionReport): Promise<void> {
        console.log('[VisionManager] Applying manual autonomous fixes from report...');

        // Thresholds based on default plan logic
        if (report.layout.overall < 80) {
            await this.autoFix({ type: 'layout' }, report);
        }
        if (report.overlap.statistics.totalOverlaps > 0) {
            await this.autoFix({ type: 'overlap' }, report);
        }
        if (report.legibility.failures && report.legibility.failures.length > 0) {
            await this.autoFix({ type: 'legibility' }, report);
        }
        if (report.color.harmonyScore < 70) {
            await this.autoFix({ type: 'color' }, report);
        }

        console.log('[VisionManager] Autonomous fixes dispatched.');
    }

    public stopAutonomousCorrection(): void {
        if (this.autonomousTimer) {
            clearInterval(this.autonomousTimer);
            this.autonomousTimer = null;
            console.log('[VisionManager] Stopped autonomous correction loop');
        }
    }
}
