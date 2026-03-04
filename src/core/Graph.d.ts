import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, EdgeSpec, GraphSpec } from '../types';
export declare class Graph {
    sg: SpaceGraph;
    nodes: Map<string, any>;
    edges: any[];
    constructor(sg: SpaceGraph);
    addNode(spec: NodeSpec): any;
    updateNode(id: string, updates: Partial<NodeSpec>): any;
    addEdge(spec: EdgeSpec): any;
    updateEdge(id: string, updates: Partial<EdgeSpec>): any;
    removeNode(id: string): void;
    removeEdge(id: string): void;
    clear(): void;
    query(predicate: (node: any) => boolean): any[];
    neighbors(nodeId: string): any[];
    toJSON(): GraphSpec;
    fromJSON(spec: GraphSpec): void;
}
