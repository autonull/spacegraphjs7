import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { GraphSpec, NodeSpec, EdgeSpec, NodeData } from '../types';
import { safeClone } from '../utils/math';

export class GraphSerialization {
    constructor(
        private readonly nodes: Map<string, Node>,
        private readonly edges: Map<string, Edge>,
    ) {}

    toJSON(): GraphSpec {
        return {
            nodes: [...this.nodes.values()].map(({ id, type, label, position, data }) => ({
                id,
                type,
                label,
                position: [position.x, position.y, position.z] as [number, number, number],
                data: safeClone(data),
            })),
            edges: [...this.edges.values()].map(({ id, source, target, type, data }) => ({
                id,
                source: source.id,
                target: target.id,
                type: type ?? 'Edge',
                data: safeClone(data),
            })),
        };
    }

    from(spec: GraphSpec): void {
        // This is a placeholder - actual implementation would need addNode/addEdge methods
        // The Graph class will call addNode/addEdge directly
    }

    // Snapshot/Restore
    snapshot(): Map<
        string,
        {
            position: { x: number; y: number; z: number; copy: (p: any) => void; clone: () => any };
            data: NodeData;
        }
    > {
        const snap = new Map<
            string,
            {
                position: {
                    x: number;
                    y: number;
                    z: number;
                    copy: (p: any) => void;
                    clone: () => any;
                };
                data: NodeData;
            }
        >();
        for (const [id, node] of this.nodes) {
            snap.set(id, { position: node.position.clone(), data: { ...node.data } });
        }
        return snap;
    }

    restore(
        snapshot: Map<
            string,
            {
                position: { x: number; y: number; z: number; copy: (p: any) => void };
                data: NodeData;
            }
        >,
    ): void {
        for (const [id, state] of snapshot) {
            const node = this.nodes.get(id);
            if (node) {
                node.position.copy(state.position);
                node.object.position.copy(state.position);
                node.data = { ...state.data };
            }
        }
    }
}
