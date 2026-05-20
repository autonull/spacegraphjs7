import * as THREE from 'three';
import { Tensor } from 'onnxruntime-web';
import type { VisionStrategy, VisionReport, VisionContext, LegibilityResult, OverlapResult, HierarchyResult, ErgonomicsResult } from '../types';
import type { VisionModelLoader } from '../VisionModelLoader';

export class OnnxStrategy implements VisionStrategy {
    readonly id = 'onnx';
    readonly name = 'AI Vision Models';

    constructor(private readonly modelLoader: VisionModelLoader) {}

    async analyze(graph: unknown, camera: unknown): Promise<VisionReport> {
        const nodes = this.extractNodes(graph);
        const context: VisionContext = { graph, camera, nodes };

        const [legibility, overlap, hierarchy, ergonomics, colorScore] = await Promise.all([
            this.analyzeLegibility(context),
            this.analyzeOverlap(context),
            this.analyzeHierarchy(context),
            this.analyzeErgonomics(context),
            this.analyzeColor(context)
        ]);

        const score = (legibility.averageContrast + (100 - overlap.overlapCount * 5) + hierarchy.score + ergonomics.score + colorScore) / 5;
        const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

        return {
            legibility,
            overlap,
            hierarchy,
            ergonomics,
            overall: {
                score,
                grade,
                issues: [
                    ...legibility.failures.map(f => ({ severity: f.severity, category: 'legibility' as const, message: `AI detected low legibility on node ${f.nodeId}` })),
                    ...overlap.overlaps.map(o => ({ severity: 'error' as const, category: 'overlap' as const, message: `AI detected overlap between ${o.nodeA} and ${o.nodeB}` })),
                ]
            }
        };
    }

    private extractNodes(graph: unknown): any[] {
        if (graph && typeof graph === 'object' && 'getNodes' in graph) {
            const nodes = (graph as any).getNodes();
            return Array.from(nodes.values ? nodes.values() : nodes);
        }
        if (graph && typeof graph === 'object' && 'nodes' in graph && graph.nodes instanceof Map) {
            return Array.from(graph.nodes.values());
        }
        return [];
    }

    private async analyzeLegibility(context: VisionContext): Promise<LegibilityResult> {
        const session = this.modelLoader.getSession('tla') || this.modelLoader.getSession('tla_model');
        if (!session) return { wcagAA: true, averageContrast: 100, failures: [] };

        const failures: any[] = [];
        let totalScore = 0;

        for (const node of context.nodes as any[]) {
            const bg = new THREE.Color(0x1a1a2e); // Default background
            const fg = new THREE.Color(node.data?.color ?? 0xffffff);
            const size = (node.data?.fontSize ?? 14) / 50.0;
            const weight = (node.data?.fontWeight ?? 400) / 1000.0;

            const input = new Float32Array([bg.r, bg.g, bg.b, fg.r, fg.g, fg.b, size, weight]);
            const tensor = new Tensor('float32', input, [1, 8]);

            try {
                const output = await session.run({ text_features: tensor });
                const score = (output.legibility_score.data as Float32Array)[0] * 100;
                totalScore += score;
                if (score < 70) {
                    failures.push({ nodeId: node.id, contrast: score, severity: score < 40 ? 'error' : 'warning' });
                }
            } catch (e) {
                console.error('TLA inference failed', e);
            }
        }

        return {
            wcagAA: failures.length === 0,
            averageContrast: context.nodes.length > 0 ? totalScore / context.nodes.length : 100,
            failures
        };
    }

    private async analyzeOverlap(context: VisionContext): Promise<OverlapResult> {
        const session = this.modelLoader.getSession('odn') || this.modelLoader.getSession('odn_model');
        if (!session) {
            console.warn('[OnnxStrategy] ODN session not found. Available:', this.modelLoader.getAvailableModels());
            return { hasOverlaps: false, overlapCount: 0, overlaps: [] };
        }

        const overlaps: any[] = [];
        const nodes = context.nodes as any[];

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];

                const b1 = this.getNodeBounds(n1);
                const b2 = this.getNodeBounds(n2);

                const input = new Float32Array([
                    b1.min.x / 1000, b1.min.y / 1000, b1.max.x / 1000, b1.max.y / 1000,
                    b2.min.x / 1000, b2.min.y / 1000, b2.max.x / 1000, b2.max.y / 1000
                ]);
                const tensor = new Tensor('float32', input, [1, 8]);

                try {
                    const output = await session.run({ boxes: tensor });
                    const prob = (output.overlap_prob.data as Float32Array)[0];
                    console.log(`[OnnxStrategy] Overlap check ${n1.id} vs ${n2.id}: prob=${prob}`);
                    if (prob > 0.5) {
                        overlaps.push({ nodeA: n1.id, nodeB: n2.id, penetration: prob });
                    }
                } catch (e) {
                    console.error('ODN inference failed', e);
                }
            }
        }

        return {
            hasOverlaps: overlaps.length > 0,
            overlapCount: overlaps.length,
            overlaps
        };
    }

    private getNodeBounds(node: any): THREE.Box2 {
        const size = node.data?.size ?? 50;
        const width = node.data?.width ?? size;
        const height = node.data?.height ?? size;
        return new THREE.Box2(
            new THREE.Vector2(node.position.x - width / 2, node.position.y - height / 2),
            new THREE.Vector2(node.position.x + width / 2, node.position.y + height / 2)
        );
    }

    private async analyzeHierarchy(context: VisionContext): Promise<HierarchyResult> {
        const session = this.modelLoader.getSession('vhs') || this.modelLoader.getSession('vhs_model');
        if (!session) return { hasRoot: false, rootIds: [], depth: 0, levels: [], score: 100 };

        const nodes = context.nodes as any[];
        const edges = (context.graph as any).edges?.size ?? 0;

        const input = new Float32Array([0.5, 0.5, nodes.length / 1000, edges / 2000]);
        const tensor = new Tensor('float32', input, [1, 4]);

        try {
            const output = await session.run({ hierarchy_features: tensor });
            const score = (output.hierarchy_score.data as Float32Array)[0] * 100;
            return { hasRoot: true, rootIds: [], depth: 3, levels: [], score };
        } catch (e) {
            return { hasRoot: false, rootIds: [], depth: 0, levels: [], score: 50 };
        }
    }

    private async analyzeErgonomics(context: VisionContext): Promise<ErgonomicsResult> {
        const session = this.modelLoader.getSession('eqa') || this.modelLoader.getSession('eqa_model');
        if (!session) return { fittsLawCompliant: true, averageTargetSize: 44, smallTargets: [], score: 100 };

        const nodes = context.nodes as any[];
        const smallTargets = nodes.filter(n => (n.data?.size ?? 50) < 20);
        const pctSmall = smallTargets.length / Math.max(1, nodes.length);

        const input = new Float32Array([pctSmall, nodes.length / 1000, 1.0, 1.0]);
        const tensor = new Tensor('float32', input, [1, 4]);

        try {
            const output = await session.run({ ergonomic_features: tensor });
            const score = (output.fittslaw_score.data as Float32Array)[0] * 100;
            return {
                fittsLawCompliant: score > 70,
                averageTargetSize: 44,
                smallTargets: smallTargets.map(n => ({ nodeId: n.id, size: n.data?.size ?? 0, recommended: 44 })),
                score
            };
        } catch (e) {
            return { fittsLawCompliant: true, averageTargetSize: 44, smallTargets: [], score: 50 };
        }
    }

    private async analyzeColor(context: VisionContext): Promise<number> {
        const session = this.modelLoader.getSession('che') || this.modelLoader.getSession('che_model');
        if (!session) return 100;

        const nodes = context.nodes as any[];
        if (nodes.length < 3) return 100;

        let totalScore = 0;
        let count = 0;

        for (let i = 0; i < nodes.length - 2; i += 3) {
            const c1 = new THREE.Color(nodes[i].data?.color ?? 0xffffff);
            const c2 = new THREE.Color(nodes[i+1].data?.color ?? 0xffffff);
            const c3 = new THREE.Color(nodes[i+2].data?.color ?? 0xffffff);

            const input = new Float32Array([c1.r, c1.g, c1.b, c2.r, c2.g, c2.b, c3.r, c3.g, c3.b]);
            const tensor = new Tensor('float32', input, [1, 9]);

            try {
                const output = await session.run({ color_neighborhood: tensor });
                totalScore += (output.harmony_score.data as Float32Array)[0] * 100;
                count++;
            } catch (e) {
                console.error('CHE inference failed', e);
            }
        }

        return count > 0 ? totalScore / count : 100;
    }
}
