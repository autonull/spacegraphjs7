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
    private cameraViewProjectionMatrix = new THREE.Matrix4();
    private frustum = new THREE.Frustum();

    private executionProviders: string[];

    constructor(sg: SpaceGraph) {
        this.sg = sg;
        // Default to wasm, but allow override via SpaceGraphOptions for Hardware Acceleration Hooks.
        // E.g., for SpaceGraph Mini (RK3588), we attempt to use the 'rknn' provider for NPU offloading.
        this.executionProviders = sg.options?.onnxExecutionProviders || ['wasm'];

        // Automatically append rknn for RK3588 NPU acceleration if running in a Node environment that supports it
        // This acts as a hook/fallback when deploying on SpaceGraph Mini hardware.
        if (typeof process !== 'undefined' && process.arch === 'arm64' && !this.executionProviders.includes('rknn')) {
             this.executionProviders.unshift('rknn');
        }
    }

    // Holds actual ONNX runtime sessions
    private sessions: Record<string, InferenceSession> = {};
    public modelsLoaded: boolean = false;

    public async loadModels(modelPaths: Record<string, string>): Promise<void> {
        console.log(`[VisionManager] Initializing ONNX session with providers [${this.executionProviders.join(', ')}]: `, modelPaths);

        for (const [key, path] of Object.entries(modelPaths)) {
            try {
                this.sessions[key] = await InferenceSession.create(path, {
                    executionProviders: this.executionProviders,
                });
                console.log(`[VisionManager] Loaded ${key} ONNX model from ${path}`);
            } catch (err) {
                console.error(`[VisionManager] Failed to load ONNX model ${key}:`, err);
            }
        }
        this.modelsLoaded = true;
        console.log('[VisionManager] ONNX models loaded.', Object.keys(this.sessions));
    }

    private async _analyzeLegibility(nodes: any[], frustum: THREE.Frustum): Promise<{ legibilityFailures: any[], colorHarmonyScore: number, dominantPalette: string[], wcagAA: boolean }> {
        const legibilityFailures = [];
        let colorHarmonyScore = 100;
        const dominantPalette: string[] = [];
        let wcagAA = true;
        const bgColorThree = new THREE.Color(this.sg.renderer.scene.background as THREE.Color);
        const bgColor = { r: bgColorThree.r * 255, g: bgColorThree.g * 255, b: bgColorThree.b * 255 };

        for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i];
            const nodeColor = nodeA.data?.color ? hexToRgb(nodeA.data.color) : { r: 200, g: 200, b: 200 };
            dominantPalette.push(nodeA.data?.color || '#cccccc');

            if (nodeColor) {
                const nodeL1 = getLuminance(nodeColor.r, nodeColor.g, nodeColor.b);
                const textL2 = getLuminance(255, 255, 255);
                const brightest = Math.max(nodeL1, textL2);
                const darkest = Math.min(nodeL1, textL2);
                const contrastRatio = (brightest + 0.05) / (darkest + 0.05);

                let verifiedIssue = false;
                if (contrastRatio < 4.5) {
                    verifiedIssue = true;
                    if (this.sessions['tla']) {
                        try {
                            const inputs = new Float32Array([nodeColor.r / 255, nodeColor.g / 255, nodeColor.b / 255, 1.0, 1.0, 1.0, 14.0, 400.0]);
                            const tensor = new Tensor('float32', inputs, [1, 8]);
                            const result = await this.sessions['tla'].run({ text_features: tensor });
                            const prob = result['legibility_score'].data[0] as number;
                            if (prob >= 0.5) verifiedIssue = false;
                        } catch (e) {
                            console.error('[VisionManager] TLA model inference failed', e);
                        }
                    }

                    if (this.sessions['che'] && verifiedIssue) {
                        try {
                            const inputs = new Float32Array([nodeColor.r / 255, nodeColor.g / 255, nodeColor.b / 255, bgColor.r / 255, bgColor.g / 255, bgColor.b / 255, 0.5, 0.5, 0.5]);
                            const tensor = new Tensor('float32', inputs, [1, 9]);
                            const result = await this.sessions['che'].run({ color_neighborhood: tensor });
                            const prob = result['harmony_score'].data[0] as number;
                            if (prob < 0.5) colorHarmonyScore -= 10;
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
        }
        return { legibilityFailures, colorHarmonyScore, dominantPalette, wcagAA };
    }

    private async _analyzeOverlaps(nodes: any[], frustum: THREE.Frustum): Promise<{ overlaps: any[], layoutScore: number }> {
        const overlaps = [];
        let layoutScore = 100;
        this.spatialIndex.build(nodes);

        const boxA = new THREE.Box3();
        const boxB = new THREE.Box3();

        for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i];
            if (!frustum.containsPoint(nodeA.object.position)) continue;

            boxA.setFromObject(nodeA.object);
            boxA.expandByScalar(5);

            const neighbors = this.spatialIndex.queryBox(boxA);

            for (const nodeB of neighbors) {
                if (nodeA.id === nodeB.id || nodeB.id < nodeA.id) continue;
                if (!frustum.containsPoint(nodeB.object.position)) continue;

                boxB.setFromObject(nodeB.object);
                boxB.expandByScalar(5);

                if (boxA.intersectsBox(boxB)) {
                    let verifiedOverlap = true;
                    if (this.sessions['odn']) {
                        try {
                            const inputs = new Float32Array([boxA.min.x, boxA.min.y, boxA.max.x, boxA.max.y, boxB.min.x, boxB.min.y, boxB.max.x, boxB.max.y]);
                            const tensor = new Tensor('float32', inputs, [1, 8]);
                            const result = await this.sessions['odn'].run({ boxes: tensor });
                            const prob = result['overlap_prob'].data[0] as number;
                            if (prob < 0.5) verifiedOverlap = false;
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
        return { overlaps, layoutScore };
    }

    private async _analyzeHierarchy(nodes: any[]): Promise<{ hierarchyScore: number }> {
        let hierarchyScore = 85;
        const inDegrees = new Map<string, number>();
        for (const n of nodes) {
            inDegrees.set(n.id, 0);
        }
        for (const e of this.sg.graph.edges) {
            if (e.target && e.target.id) {
                inDegrees.set(e.target.id, (inDegrees.get(e.target.id) || 0) + 1);
            }
        }

        let maxDepth = 0;
        const queue: { id: string; depth: number }[] = [];
        for (const [id, deg] of inDegrees) {
            if (deg === 0) queue.push({ id, depth: 0 });
        }

        const depths: number[] = [];
        while (queue.length > 0) {
            const current = queue.shift()!;
            maxDepth = Math.max(maxDepth, current.depth);
            depths.push(current.depth);

            for (const edge of this.sg.graph.edges) {
                if (edge.source.id === current.id) {
                    queue.push({ id: edge.target.id, depth: current.depth + 1 });
                }
            }
        }

        if (this.sessions['vhs'] && depths.length > 0) {
            try {
                const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
                const inputs = new Float32Array([avgDepth, maxDepth, nodes.length, this.sg.graph.edges.length]);
                const tensor = new Tensor('float32', inputs, [1, 4]);
                const result = await this.sessions['vhs'].run({ hierarchy_features: tensor });
                hierarchyScore = Math.floor((result['hierarchy_score'].data[0] as number) * 100);
            } catch (e) {
                console.error('[VisionManager] VHS model inference failed', e);
            }
        }
        return { hierarchyScore };
    }

    private async _analyzeErgonomics(nodes: any[], camera: THREE.PerspectiveCamera, frustum: THREE.Frustum): Promise<{ fittsLawScore: number }> {
        let fittsLawScore = 90;
        let smallTargets = 0;
        const screenWidth = this.sg.renderer.renderer.domElement.width;
        const screenHeight = this.sg.renderer.renderer.domElement.height;

        const box = new THREE.Box3();
        const size = new THREE.Vector3();

        for (const node of nodes) {
            if (!frustum.containsPoint(node.object.position)) continue;

            node.object.position.clone().project(camera);
            box.setFromObject(node.object);
            box.getSize(size);

            const distance = camera.position.distanceTo(node.object.position);
            const apparentSize = (Math.max(size.x, size.y) / distance) * screenHeight;

            if (apparentSize < 44) smallTargets++;
        }

        const pctSmall = nodes.length > 0 ? smallTargets / nodes.length : 0;

        if (this.sessions['eqa']) {
            try {
                const inputs = new Float32Array([pctSmall, nodes.length, screenWidth, screenHeight]);
                const tensor = new Tensor('float32', inputs, [1, 4]);
                const result = await this.sessions['eqa'].run({ ergonomic_features: tensor });
                fittsLawScore = Math.floor((result['fittslaw_score'].data[0] as number) * 100);
            } catch (e) {
                console.error('[VisionManager] EQA model inference failed', e);
            }
        } else {
            fittsLawScore = Math.max(0, 100 - pctSmall * 100);
        }
        return { fittsLawScore };
    }

    public async analyzeVision(): Promise<VisionReport> {
        if (this.isAnalyzing) {
            throw new Error('[VisionManager] Analysis already in progress.');
        }

        this.isAnalyzing = true;
        console.log('[VisionManager] Starting automated visual analysis loop...');

        if (Object.keys(this.sessions).length > 0) {
            console.log('[VisionManager] Running ONNX inference for Graph Vision...');
        }

        const nodes = Array.from(this.sg.graph.nodes.values());
        const camera = this.sg.renderer.camera;
        camera.updateMatrixWorld();
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        this.cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);

        const { legibilityFailures, colorHarmonyScore, dominantPalette, wcagAA } = await this._analyzeLegibility(nodes, this.frustum);
        const { overlaps, layoutScore } = await this._analyzeOverlaps(nodes, this.frustum);
        const { hierarchyScore } = await this._analyzeHierarchy(nodes);
        const { fittsLawScore } = await this._analyzeErgonomics(nodes, camera, this.frustum);

        const mockReport: VisionReport = {
            layout: { overall: Math.max(0, layoutScore), issues: overlaps },
            legibility: { wcagCompliance: { AA: wcagAA }, failures: legibilityFailures },
            color: {
                harmonyScore: Math.max(0, colorHarmonyScore),
                dominantPalette: [...new Set(dominantPalette)].slice(0, 5),
            },
            overlap: { overlaps: overlaps, statistics: { totalOverlaps: overlaps.length } },
            hierarchy: { clarityScore: Math.max(0, hierarchyScore) },
            ergonomics: { fittsLawScore: Math.max(0, fittsLawScore) },
            overall: Math.max(
                0,
                layoutScore -
                overlaps.length * 2 -
                legibilityFailures.length * 5 -
                (100 - hierarchyScore) * 0.5 -
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
            if (hierarchyScore < 60) {
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

        if (!report) return;

        switch (category.type) {
            case 'legibility':
            case 'color':
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
                break;

            case 'overlap':
                console.log('[VisionManager] Applying overlap corrections...');
                const autoLayoutPlugin: any = this.sg.pluginManager.getPlugin('AutoLayoutPlugin');

                if (autoLayoutPlugin && typeof autoLayoutPlugin.fixOverlaps === 'function') {
                    autoLayoutPlugin.fixOverlaps(report.overlap.overlaps);
                    console.log('[VisionManager] AutoLayoutPlugin overlap corrections applied.');
                } else {
                    const forceLayout: any = this.sg.pluginManager.getPlugin('ForceLayout');
                    if (forceLayout && typeof forceLayout.update === 'function') {
                        console.log('[VisionManager] AutoLayoutPlugin not found, falling back to ForceLayout...');

                        const originalRepulsion = forceLayout.settings.repulsion || 10000;
                        forceLayout.settings.repulsion = originalRepulsion * 5;

                        for (let i = 0; i < 50; i++) {
                            forceLayout.update();
                        }

                        forceLayout.settings.repulsion = originalRepulsion;
                    } else {
                        console.warn('[VisionManager] No suitable layout plugin found to perform autoFix.');
                    }
                }
                break;

            case 'hierarchy':
                console.log('[VisionManager] Applying hierarchy corrections...');
                const hierLayout: any = this.sg.pluginManager.getPlugin('HierarchicalLayout');
                if (hierLayout && typeof hierLayout.fixHierarchy === 'function') {
                    hierLayout.fixHierarchy();
                } else if (hierLayout && typeof hierLayout.apply === 'function') {
                    hierLayout.apply();
                }
                break;

            case 'ergonomics':
                console.log('[VisionManager] Applying ergonomics corrections (camera zoom limit)...');
                this.sg.fitView(150, 2.0);
                break;
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
                        const formattedIssues = [];
                        for (const o of report.overlap.overlaps) {
                            formattedIssues.push({
                                type: 'overlap',
                                nodeA: o.nodeA,
                                nodeB: o.nodeB,
                            });
                        }
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
