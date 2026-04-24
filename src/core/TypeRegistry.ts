import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { NodeSpec, EdgeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export type NodeConstructor = new (sg: SpaceGraph, spec: NodeSpec) => Node;
export type EdgeConstructor = new (sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) => Edge;

export class TypeRegistry {
    private static instance: TypeRegistry;
    private nodeTypes = new Map<string, NodeConstructor>();
    private edgeTypes = new Map<string, EdgeConstructor>();

    private constructor() {}
    static getInstance(): TypeRegistry { return TypeRegistry.instance ??= new TypeRegistry(); }

    registerNode(typeName: string, constructor: NodeConstructor): void {
        if (!this.nodeTypes.has(typeName)) this.nodeTypes.set(typeName, constructor);
    }

    registerEdge(typeName: string, constructor: EdgeConstructor): void {
        if (!this.edgeTypes.has(typeName)) this.edgeTypes.set(typeName, constructor);
    }

    getNodeConstructor(typeName: string): NodeConstructor | undefined { return this.nodeTypes.get(typeName); }
    getEdgeConstructor(typeName: string): EdgeConstructor | undefined { return this.edgeTypes.get(typeName); }
    hasNode(typeName: string): boolean { return this.nodeTypes.has(typeName); }
    hasEdge(typeName: string): boolean { return this.edgeTypes.has(typeName); }
    getNodeTypes(): string[] { return Array.from(this.nodeTypes.keys()); }
    getEdgeTypes(): string[] { return Array.from(this.edgeTypes.keys()); }

    createNode(sgOrSpec: SpaceGraph | NodeSpec, maybeSpec?: NodeSpec): Node {
        const spec = 'type' in sgOrSpec ? sgOrSpec as NodeSpec : maybeSpec!;
        const sg = 'type' in sgOrSpec ? undefined : sgOrSpec as SpaceGraph;
        const ctor = this.getNodeConstructor(spec.type);
        if (!ctor) throw new Error(`TypeRegistry: Unknown node type "${spec.type}". Registered: [${this.getNodeTypes().join(', ')}]`);
        return new ctor(sg ?? {} as SpaceGraph, spec);
    }

    createEdge(sgOrSpec: SpaceGraph | EdgeSpec, specOrSource: EdgeSpec | Node, sourceOrTarget?: Node, targetOrNothing?: Node): Edge {
        const isSpecFirst = 'source' in (sgOrSpec as object);
        const spec = isSpecFirst ? sgOrSpec as EdgeSpec : specOrSource as EdgeSpec;
        const sg = isSpecFirst ? undefined : sgOrSpec as SpaceGraph;
        const source = isSpecFirst ? specOrSource as Node : sourceOrTarget as Node;
        const target = isSpecFirst ? sourceOrTarget as Node : targetOrNothing as Node;
        const ctor = this.getEdgeConstructor(spec.type);
        if (!ctor) throw new Error(`TypeRegistry: Unknown edge type "${spec.type}". Registered: [${this.getEdgeTypes().join(', ')}]`);
        return new ctor(sg ?? {} as SpaceGraph, spec, source, target);
    }

    clear(): void { this.nodeTypes.clear(); this.edgeTypes.clear(); }
}

export const registerNode = (typeName: string, constructor: NodeConstructor) => TypeRegistry.getInstance().registerNode(typeName, constructor);
export const registerEdge = (typeName: string, constructor: EdgeConstructor) => TypeRegistry.getInstance().registerEdge(typeName, constructor);
