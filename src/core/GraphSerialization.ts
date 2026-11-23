import type { Vector3 } from 'three';
import type { Edge } from '../edges/Edge';
import type { Node } from '../nodes/Node';
import type { GraphSpec, NodeData } from '../types';
import { safeClone } from '../utils/math';

export interface NodeSnapshot {
    position: Vector3;
    data: NodeData;
}

export class GraphSerialization {
    constructor(
        private readonly nodes: Map<string, Node>,
        private readonly edges: Map<string, Edge>,
    ) {}

    toJSON(typeOf: (item: Node | Edge) => string = (item) => item.type): GraphSpec {
        return {
            nodes: [...this.nodes.values()].map((node) => ({
                id: node.id,
                type: typeOf(node),
                label: node.label,
                position: [node.position.x, node.position.y, node.position.z] as [
                    number,
                    number,
                    number,
                ],
                data: safeClone(node.data),
            })),
            edges: [...this.edges.values()].map((edge) => ({
                id: edge.id,
                source: edge.source.id,
                target: edge.target.id,
                type: typeOf(edge),
                data: safeClone(edge.data),
            })),
        };
    }

    snapshot(): Map<string, NodeSnapshot> {
        return new Map(
            [...this.nodes].map(([id, node]) => [
                id,
                { position: node.position.clone(), data: { ...node.data } },
            ]),
        );
    }

    restore(snapshot: Map<string, NodeSnapshot>): void {
        for (const [id, state] of snapshot) {
            const node = this.nodes.get(id);
            if (!node) continue;
            node.position.copy(state.position);
            node.object.position.copy(state.position);
            node.data = { ...state.data };
        }
    }
}
