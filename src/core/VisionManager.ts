import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import { InferenceSession, Tensor, env } from 'onnxruntime-web';
import { getLuminance, hexToRgb } from '../utils/color.js';
import { SpatialIndex } from './spatial/SpatialIndex';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('VisionManager');

env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/pnpm/onnxruntime-web/dist/';

export interface VisionCategory {
    type: 'layout' | 'legibility' | 'color' | 'overlap' | 'hierarchy' | 'ergonomics';
}

export interface VisionReport {
    layout: { overall: number; issues: unknown[] };
    legibility: { wcagCompliance: { AA: boolean }; failures: unknown[] };
    color: { harmonyScore: number; dominantPalette: string[] };
    overlap: { overlaps: unknown[]; statistics: { totalOverlaps: number } };
    hierarchy: { clarityScore: number };
    ergonomics: { fittsLawScore: number };
    overall: number;
}

/**
 * VisionManager — Accessibility and layout quality analysis for SpaceGraph.
 *
 * Architecture: Uses heuristic-based analysis (WCAG contrast, BVH overlap detection).
 * ONNX models are optional and enhance confidence when provided.
 *
 * To enable ONNX models:
 *   1. Host the .onnx model files in your public folder
 *   2. Call sg.vision.loadModels({ tla: '/tla_model.onnx', che: '/che_model.onnx', ... })
 *
 * Hardware acceleration: Override execution providers via SpaceGraphOptions
 */
export class VisionManager {
    private readonly sg: SpaceGraph;
    private isAnalyzing = false;
    private autonomousTimer: ReturnType<typeof setInterval> | null = null;
    private readonly spatialIndex = new SpatialIndex(50);
    private readonly cameraViewProjectionMatrix = new THREE.Matrix4();
    private readonly frustum = new THREE.Frustum();
    private readonly executionProviders: string[];
    private readonly sessions: Record<string, InferenceSession> = {};

    constructor(sg: SpaceGraph) {
        this.sg = sg;
        this.executionProviders = sg.options?.onnxExecutionProviders ?? ['wasm'];

        if (
            typeof process !== 'undefined' &&
            process.arch === 'arm64' &&
            !this.executionProviders.includes('rknn')
        ) {
            this.executionProviders.unshift('rknn');
        }
    }

    public modelsLoaded = false;

    public async loadModels(modelPaths: Record<string, string>): Promise<void> {
        logger.info(
            'Initializing ONNX session with providers [%s]:',
            this.executionProviders.join(', '),
            modelPaths,
        );

        for (const [key, path] of Object.entries(modelPaths)) {
            try {
                this.sessions[key] = await InferenceSession.create(path, {
                    executionProviders: this.executionProviders,
                });
                logger.info('Loaded %s ONNX model from %s', key, path);
            } catch (err) {
                logger.error('Failed to load ONNX model %s:', key, err);
            }
        }
        this.modelsLoaded = true;
        logger.info('ONNX models loaded: %s', Object.keys(this.sessions).join(', '));
    }

    private async _analyzeLegibility(
        nodes: unknown[],
        _frustum: THREE.Frustum,
    ): Promise<{
        legibilityFailures: unknown[];
        colorHarmonyScore: number;
        dominantPalette: string[];
        wcagAA: boolean;
    }> {
        const legibilityFailures: unknown[] = [];
        let colorHarmonyScore = 100;
        const dominantPalette: string[] = [];
        let wcagAA = true;
        const bgColorThree = new THREE.Color(this.sg.renderer.scene.background as THREE.Color);
        const bgColor = {
            r: bgColorThree.r * 255,
            g: bgColorThree.g * 255,
            b: bgColorThree.b * 255,
        };

        for (const nodeA of nodes) {
            const nodeColor = (nodeA as any).data?.color
                ? hexToRgb((nodeA as any).data.color)
                : { r: 200, g: 200, b: 200 };
            dominantPalette.push((nodeA as any).data?.color ?? '#cccccc');

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
                            const inputs = new Float32Array([
                                nodeColor.r / 255,
                                nodeColor.g / 255,
                                nodeColor.b / 255,
                                1.0,
                                1.0,
                                1.0,
                                14.0,
                                400.0,
                            ]);
                            const tensor = new Tensor('float32', inputs, [1, 8]);
                            const result = await this.sessions['tla'].run({
                                text_features: tensor,
                            });
                            const prob = result['legibility_score'].data[0] as number;
                            if (prob >= 0.5) verifiedIssue = false;
                        } catch (e) {
                            logger.error('TLA model inference failed:', e);
                        }
                    }

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
                                0.5,
                            ]);
                            const tensor = new Tensor('float32', inputs, [1, 9]);
                            const result = await this.sessions['che'].run({
                                color_neighborhood: tensor,
                            });
                            const prob = result['harmony_score'].data[0] as number;
                            if (prob < 0.5) colorHarmonyScore -= 10;
                        } catch (e) {
                            logger.error('CHE model inference failed:', e);
                        }
                    }
                }

                if (verifiedIssue) {
                    legibilityFailures.push({
                        type: 'legibility',
                        severity: 'error',
                        nodeId: (nodeA as any).id,
                        message: `Poor contrast ratio (${contrastRatio.toFixed(2)}:1) for node ${(nodeA as any).id}. Text may be illegible.`,
                    });
                    wcagAA = false;
                }
            }
        }
        return { legibilityFailures, colorHarmonyScore, dominantPalette, wcagAA };
    }

    private async _analyzeOverlaps(
        nodes: unknown[],
        frustum: THREE.Frustum,
    ): Promise<{ overlaps: unknown[]; layoutScore: number }> {
        const overlaps: unknown[] = [];
        let layoutScore = 100;
        this.spatialIndex.build(nodes as any);
        const processedPairs = new Set<string>();

        const boxA = new THREE.Box3();
        const boxB = new THREE.Box3();

        for (const nodeA of nodes) {
            if (!frustum.containsPoint((nodeA as any).object.position)) continue;

            boxA.setFromObject((nodeA as any).object);
            boxA.expandByScalar(5);

            const neighbors = this.spatialIndex.queryBox(boxA);

            for (const nodeB of neighbors) {
                const pairKey = [(nodeA as any).id, (nodeB as any).id].sort().join('|');
                if ((nodeA as any).id === (nodeB as any).id || processedPairs.has(pairKey))
                    continue;
                processedPairs.add(pairKey);
                if (!frustum.containsPoint((nodeB as any).object.position)) continue;

                boxB.setFromObject((nodeB as any).object);
                boxB.expandByScalar(5);

                if (boxA.intersectsBox(boxB)) {
                    let verifiedOverlap = true;
                    if (this.sessions['odn']) {
                        try {
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
                            const prob = result['overlap_prob'].data[0] as number;
                            if (prob < 0.5) verifiedOverlap = false;
                        } catch (e) {
                            logger.error('ODN model inference failed:', e);
                        }
                    }

                    if (verifiedOverlap) {
                        overlaps.push({ nodeA: (nodeA as any).id, nodeB: (nodeB as any).id });
                        layoutScore -= 10;
                    }
                }
            }
        }
        return { overlaps, layoutScore };
    }

    private async _analyzeHierarchy(nodes: unknown[]): Promise<{ hierarchyScore: number }> {
        let hierarchyScore = 85;
        const inDegrees = new Map<string, number>();
        for (const n of nodes) {
            inDegrees.set((n as any).id, 0);
        }
        for (const [, e] of this.sg.graph.edges) {
            if (e.target?.id) {
                inDegrees.set(e.target.id, (inDegrees.get(e.target.id) ?? 0) + 1);
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

            for (const [, edge] of this.sg.graph.edges) {
                if (edge.source.id === current.id) {
                    queue.push({ id: edge.target.id, depth: current.depth + 1 });
                }
            }
        }

        if (this.sessions['vhs'] && depths.length > 0) {
            try {
                const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
                const inputs = new Float32Array([
                    avgDepth,
                    maxDepth,
                    nodes.length,
                    this.sg.graph.edges.size,
                ]);
                const tensor = new Tensor('float32', inputs, [1, 4]);
                const result = await this.sessions['vhs'].run({ hierarchy_features: tensor });
                hierarchyScore = Math.floor((result['hierarchy_score'].data[0] as number) * 100);
            } catch (e) {
                logger.error('VHS model inference failed:', e);
            }
        }
        return { hierarchyScore };
    }

    private async _analyzeErgonomics(
        nodes: unknown[],
        camera: THREE.PerspectiveCamera,
        frustum: THREE.Frustum,
    ): Promise<{ fittsLawScore: number }> {
        let fittsLawScore = 90;
        let smallTargets = 0;
        const screenWidth = this.sg.renderer.renderer.domElement.width;
        const screenHeight = this.sg.renderer.renderer.domElement.height;

        const box = new THREE.Box3();
        const size = new THREE.Vector3();

        for (const node of nodes) {
            if (!frustum.containsPoint((node as any).object.position)) continue;

            (node as any).object.position.clone().project(camera);
            box.setFromObject((node as any).object);
            box.getSize(size);

            const distance = camera.position.distanceTo((node as any).object.position);
            const apparentSize = (Math.max(size.x, size.y) / distance) * screenHeight;

            if (apparentSize < 44) smallTargets++;
        }

        const pctSmall = nodes.length > 0 ? smallTargets / nodes.length : 0;

        if (this.sessions['eqa']) {
            try {
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
                logger.error('EQA model inference failed:', e);
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
        logger.info('Starting automated visual analysis loop...');

        if (Object.keys(this.sessions).length > 0) {
            logger.info('Running ONNX inference for Graph Vision...');
        }

        const nodes = Array.from(this.sg.graph.nodes.values());
        const camera = this.sg.renderer.camera;
        camera.updateMatrixWorld();
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        this.cameraViewProjectionMatrix.multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse,
        );
        this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);

        const { legibilityFailures, colorHarmonyScore, dominantPalette, wcagAA } =
            await this._analyzeLegibility(nodes, this.frustum);
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

        logger.info('Analysis complete. Overall Score: %d', mockReport.overall);

        if (mockReport.overall < 90) {
            logger.warn('Quality below threshold, triggering autonomous fix...');
            if (overlaps.length > 0) await this.autoFix({ type: 'overlap' }, mockReport);
            if (legibilityFailures.length > 0)
                await this.autoFix({ type: 'legibility' }, mockReport);
            if (hierarchyScore < 60) await this.autoFix({ type: 'hierarchy' }, mockReport);
            if (fittsLawScore < 60) await this.autoFix({ type: 'ergonomics' }, mockReport);
        }

        this.isAnalyzing = false;
        return mockReport;
    }

    public async autoFix(category: VisionCategory, report?: VisionReport): Promise<void> {
        logger.info('Triggering auto-fix for category: %s', category.type);

        if (!report) return;

        switch (category.type) {
            case 'legibility':
            case 'color': {
                logger.info('Applying color/legibility corrections...');
                const autoColorPlugin = this.sg.pluginManager.getPlugin('AutoColorPlugin') as any;

                if (
                    autoColorPlugin &&
                    typeof autoColorPlugin.applyVisionCorrection === 'function'
                ) {
                    autoColorPlugin.applyVisionCorrection(report.legibility.failures);
                    logger.info('AutoColorPlugin corrections applied.');
                } else {
                    logger.warn('AutoColorPlugin not found or missing applyVisionCorrection.');
                }
                break;
            }

            case 'overlap': {
                logger.info('Applying overlap corrections...');
                const autoLayoutPlugin = this.sg.pluginManager.getPlugin('AutoLayoutPlugin') as any;

                if (autoLayoutPlugin && typeof autoLayoutPlugin.fixOverlaps === 'function') {
                    autoLayoutPlugin.fixOverlaps(report.overlap.overlaps);
                    logger.info('AutoLayoutPlugin overlap corrections applied.');
                } else {
                    const forceLayout = this.sg.pluginManager.getPlugin('ForceLayout') as any;
                    if (forceLayout && typeof forceLayout.update === 'function') {
                        logger.info('AutoLayoutPlugin not found, falling back to ForceLayout...');

                        const originalRepulsion = forceLayout.settings.repulsion ?? 10000;
                        forceLayout.settings.repulsion = originalRepulsion * 5;

                        for (let i = 0; i < 50; i++) {
                            forceLayout.update();
                        }

                        forceLayout.settings.repulsion = originalRepulsion;
                    } else {
                        logger.warn('No suitable layout plugin found to perform autoFix.');
                    }
                }
                break;
            }

            case 'hierarchy': {
                logger.info('Applying hierarchy corrections...');
                const hierLayout = this.sg.pluginManager.getPlugin('HierarchicalLayout') as any;
                if (hierLayout && typeof hierLayout.fixHierarchy === 'function') {
                    hierLayout.fixHierarchy();
                } else if (hierLayout && typeof hierLayout.apply === 'function') {
                    hierLayout.apply();
                }
                break;
            }

            case 'ergonomics':
                logger.info('Applying ergonomics corrections (camera zoom limit)...');
                this.sg.fitView(150, 2.0);
                break;
        }
    }

    /**
     * The Vision-Closed loop: periodically analyzes the view and triggers
     * plugins to correct aesthetic/layout issues autonomously.
     */
    public startAutonomousCorrection(intervalMs = 30000): void {
        if (this.autonomousTimer) {
            this.stopAutonomousCorrection();
        }

        logger.info('Starting autonomous correction loop (interval: %dms)', intervalMs);

        this.autonomousTimer = setInterval(async () => {
            try {
                const report = await this.analyzeVision();

                if (report.overlap.overlaps.length > 0) {
                    const autoLayout = this.sg.pluginManager.getPlugin('auto-layout') as any;
                    if (autoLayout && typeof autoLayout.applyVisionCorrection === 'function') {
                        const formattedIssues = report.overlap.overlaps.map((o: any) => ({
                            type: 'overlap',
                            nodeA: o.nodeA,
                            nodeB: o.nodeB,
                        }));
                        autoLayout.applyVisionCorrection(formattedIssues);
                    }
                }
            } catch (err) {
                logger.error('Autonomous loop error:', err);
            }
        }, intervalMs);
    }

    /**
     * Imperatively triggers auto-fixes for all failing categories in a given report.
     */
    public async applyAutonomousFixes(report: VisionReport): Promise<void> {
        logger.info('Applying manual autonomous fixes from report...');

        if (report.layout.overall < 80) {
            await this.autoFix({ type: 'layout' }, report);
        }
        if (report.overlap.statistics.totalOverlaps > 0) {
            await this.autoFix({ type: 'overlap' }, report);
        }
        if (report.legibility.failures?.length > 0) {
            await this.autoFix({ type: 'legibility' }, report);
        }
        if (report.color.harmonyScore < 70) {
            await this.autoFix({ type: 'color' }, report);
        }

        logger.info('Autonomous fixes dispatched.');
    }

    public stopAutonomousCorrection(): void {
        if (this.autonomousTimer) {
            clearInterval(this.autonomousTimer);
            this.autonomousTimer = null;
            logger.info('Stopped autonomous correction loop');
        }
    }

    public startAutonomousAnalysis(intervalMs = 30000): void {
        this.startAutonomousCorrection(intervalMs);
    }

    public stopAutonomousAnalysis(): void {
        this.stopAutonomousCorrection();
    }
}
