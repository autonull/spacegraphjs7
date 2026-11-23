import type { VisionModelLoader } from '..';
import type { InferenceSession } from 'onnxruntime-web';
import { gradeFor } from '../grade';
import { createLogger } from '../../utils/logger';
import { nodesOf } from '../nodesOf';
import * as THREE from 'three';
import type {
    ErgonomicsResult,
    HierarchyResult,
    LegibilityResult,
    OverlapResult,
    VisionContext,
    VisionReport,
    VisionStrategy,
} from '../types';

interface AnalysisNode {
    id: string;
    data?: {
        color?: number;
        fontSize?: number;
        fontWeight?: number;
        size?: number;
        width?: number;
        height?: number;
    };
    position: { x: number; y: number };
}

const logger = createLogger('OnnxStrategy');

export class OnnxStrategy implements VisionStrategy {
    readonly id = 'onnx';
    readonly name = 'AI Vision Models';

    constructor(readonly modelLoader: VisionModelLoader) {}

    private async tensor(data: Float32Array, dims: number[]) {
        const { Tensor } = await import('onnxruntime-web');
        return new Tensor('float32', data, dims);
    }

    private session(key: string) {
        return this.modelLoader.getSession(key) || this.modelLoader.getSession(`${key}_model`);
    }

    private async infer(
        session: InferenceSession,
        inputs: Record<string, Awaited<ReturnType<typeof this.tensor>>>,
        output: string,
        scale = 1,
        label?: string,
    ): Promise<number | undefined> {
        try {
            const result = await session.run(inputs);
            return (result[output].data as Float32Array)[0] * scale;
        } catch (e) {
            if (label) logger.error(`${label} inference failed`, e);
            return undefined;
        }
    }

    async analyze(graph: unknown, camera: unknown): Promise<VisionReport> {
        const nodes = nodesOf(graph);
        const context: VisionContext = { graph, camera, nodes };

        const [legibility, overlap, hierarchy, ergonomics, colorScore] = await Promise.all([
            this.analyzeLegibility(context),
            this.analyzeOverlap(context),
            this.analyzeHierarchy(context),
            this.analyzeErgonomics(context),
            this.analyzeColor(context),
        ]);

        const score =
            (legibility.averageContrast +
                (100 - overlap.overlapCount * 5) +
                hierarchy.score +
                ergonomics.score +
                colorScore) /
            5;
        const grade = gradeFor(score);

        return {
            legibility,
            overlap,
            hierarchy,
            ergonomics,
            overall: {
                score,
                grade,
                issues: [
                    ...legibility.failures.map((f) => ({
                        severity: f.severity,
                        category: 'legibility' as const,
                        message: `AI detected low legibility on node ${f.nodeId}`,
                    })),
                    ...overlap.overlaps.map((o) => ({
                        severity: 'error' as const,
                        category: 'overlap' as const,
                        message: `AI detected overlap between ${o.nodeA} and ${o.nodeB}`,
                    })),
                ],
            },
        };
    }

    private async analyzeLegibility(context: VisionContext): Promise<LegibilityResult> {
        const session = this.session('tla');
        if (!session) return { wcagAA: true, averageContrast: 100, failures: [] };

        const failures: LegibilityResult['failures'] = [];
        let totalScore = 0;

        for (const node of context.nodes as AnalysisNode[]) {
            const bg = new THREE.Color(0x1a1a2e); // Default background
            const fg = new THREE.Color(node.data?.color ?? 0xffffff);
            const size = (node.data?.fontSize ?? 14) / 50.0;
            const weight = (node.data?.fontWeight ?? 400) / 1000.0;

            const input = new Float32Array([bg.r, bg.g, bg.b, fg.r, fg.g, fg.b, size, weight]);
            const tensor = await this.tensor(input, [1, 8]);

            const score = await this.infer(session, { text_features: tensor }, 'legibility_score', 100, 'TLA');
            if (score === undefined) continue;
            totalScore += score;
            if (score < 70) {
                failures.push({
                    nodeId: node.id,
                    contrast: score,
                    severity: score < 40 ? 'error' : 'warning',
                });
            }
        }

        return {
            wcagAA: failures.length === 0,
            averageContrast: context.nodes.length > 0 ? totalScore / context.nodes.length : 100,
            failures,
        };
    }

    private async analyzeOverlap(context: VisionContext): Promise<OverlapResult> {
        const session = this.session('odn');
        if (!session) {
            logger.warn('ODN session not found. Available:', this.modelLoader.getAvailableModels());
            return { hasOverlaps: false, overlapCount: 0, overlaps: [] };
        }

        const overlaps: OverlapResult['overlaps'] = [];
        const nodes = context.nodes as AnalysisNode[];

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];

                const b1 = this.getNodeBounds(n1);
                const b2 = this.getNodeBounds(n2);

                const input = new Float32Array([
                    b1.min.x / 1000,
                    b1.min.y / 1000,
                    b1.max.x / 1000,
                    b1.max.y / 1000,
                    b2.min.x / 1000,
                    b2.min.y / 1000,
                    b2.max.x / 1000,
                    b2.max.y / 1000,
                ]);
                const tensor = await this.tensor(input, [1, 8]);

                const prob = await this.infer(session, { boxes: tensor }, 'overlap_prob', 1, 'ODN');
                if (prob !== undefined && prob > 0.5) {
                    overlaps.push({ nodeA: n1.id, nodeB: n2.id, penetration: prob });
                }
            }
        }

        return {
            hasOverlaps: overlaps.length > 0,
            overlapCount: overlaps.length,
            overlaps,
        };
    }

    private getNodeBounds(node: AnalysisNode): THREE.Box2 {
        const size = node.data?.size ?? 50;
        const width = node.data?.width ?? size;
        const height = node.data?.height ?? size;
        return new THREE.Box2(
            new THREE.Vector2(node.position.x - width / 2, node.position.y - height / 2),
            new THREE.Vector2(node.position.x + width / 2, node.position.y + height / 2),
        );
    }

    private async analyzeHierarchy(context: VisionContext): Promise<HierarchyResult> {
        const session = this.session('vhs');
        if (!session) return { hasRoot: false, rootIds: [], depth: 0, levels: [], score: 100 };

        const nodes = context.nodes as AnalysisNode[];
        const edges = (context.graph as { edges?: { size: number } }).edges?.size ?? 0;

        const input = new Float32Array([0.5, 0.5, nodes.length / 1000, edges / 2000]);
        const tensor = await this.tensor(input, [1, 4]);

        const score = await this.infer(session, { hierarchy_features: tensor }, 'hierarchy_score', 100);
        return score === undefined
            ? { hasRoot: false, rootIds: [], depth: 0, levels: [], score: 50 }
            : { hasRoot: true, rootIds: [], depth: 3, levels: [], score };
    }

    private async analyzeErgonomics(context: VisionContext): Promise<ErgonomicsResult> {
        const session = this.session('eqa');
        if (!session)
            return { fittsLawCompliant: true, averageTargetSize: 44, smallTargets: [], score: 100 };

        const nodes = context.nodes as AnalysisNode[];
        const smallTargets = nodes.filter((n) => (n.data?.size ?? 50) < 20);
        const pctSmall = smallTargets.length / Math.max(1, nodes.length);

        const input = new Float32Array([pctSmall, nodes.length / 1000, 1.0, 1.0]);
        const tensor = await this.tensor(input, [1, 4]);

        const score = await this.infer(session, { ergonomic_features: tensor }, 'fittslaw_score', 100);
        if (score === undefined)
            return { fittsLawCompliant: true, averageTargetSize: 44, smallTargets: [], score: 50 };
        return {
            fittsLawCompliant: score > 70,
            averageTargetSize: 44,
            smallTargets: smallTargets.map((n) => ({
                nodeId: n.id,
                size: n.data?.size ?? 0,
                recommended: 44,
            })),
            score,
        };
    }

    private async analyzeColor(context: VisionContext): Promise<number> {
        const session = this.session('che');
        if (!session) return 100;

        const nodes = context.nodes as AnalysisNode[];
        if (nodes.length < 3) return 100;

        let totalScore = 0;
        let count = 0;

        for (let i = 0; i < nodes.length - 2; i += 3) {
            const c1 = new THREE.Color(nodes[i].data?.color ?? 0xffffff);
            const c2 = new THREE.Color(nodes[i + 1].data?.color ?? 0xffffff);
            const c3 = new THREE.Color(nodes[i + 2].data?.color ?? 0xffffff);

            const input = new Float32Array([c1.r, c1.g, c1.b, c2.r, c2.g, c2.b, c3.r, c3.g, c3.b]);
            const tensor = await this.tensor(input, [1, 9]);

            const score = await this.infer(session, { color_neighborhood: tensor }, 'harmony_score', 100, 'CHE');
            if (score === undefined) continue;
            totalScore += score;
            count++;
        }

        return count > 0 ? totalScore / count : 100;
    }
}
