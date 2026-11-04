import type { Edge } from '../edges/Edge';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeConstructor, EdgeSpec, NodeConstructor, NodeSpec } from '../types';

export type { EdgeConstructor, NodeConstructor };

export class TypeRegistry {
    private static instance: TypeRegistry;
    private readonly nodeTypes = new Map<string, NodeConstructor>();
    private readonly edgeTypes = new Map<string, EdgeConstructor>();

    private constructor() {}

    static getInstance(): TypeRegistry {
        return (TypeRegistry.instance ??= new TypeRegistry());
    }

    registerNode(type: string, ctor: NodeConstructor): this {
        this.nodeTypes.set(type, ctor);
        this.#registerTypeAlias(ctor, this.nodeTypes);
        return this;
    }

    registerEdge(type: string, ctor: EdgeConstructor): this {
        this.edgeTypes.set(type, ctor);
        this.#registerTypeAlias(ctor, this.edgeTypes);
        return this;
    }

    // Register multiple at once
    registerNodes(types: Record<string, NodeConstructor>): this {
        for (const [type, ctor] of Object.entries(types)) this.registerNode(type, ctor);
        return this;
    }

    registerEdges(types: Record<string, EdgeConstructor>): this {
        for (const [type, ctor] of Object.entries(types)) this.registerEdge(type, ctor);
        return this;
    }

    // Unregister
    unregisterNode(type: string): boolean {
        return this.nodeTypes.delete(type);
    }

    unregisterEdge(type: string): boolean {
        return this.edgeTypes.delete(type);
    }

    getNodeConstructor(type: string): NodeConstructor | undefined {
        return this.nodeTypes.get(type);
    }

    getEdgeConstructor(type: string): EdgeConstructor | undefined {
        return this.edgeTypes.get(type);
    }

    hasNode(type: string): boolean {
        return this.nodeTypes.has(type);
    }

    hasEdge(type: string): boolean {
        return this.edgeTypes.has(type);
    }

    getNodeTypes(): string[] {
        return [...this.nodeTypes.keys()];
    }

    getEdgeTypes(): string[] {
        return [...this.edgeTypes.keys()];
    }

    // Get all types as arrays
    getNodeTypeList(): Array<{ type: string; ctor: NodeConstructor }> {
        return [...this.nodeTypes.entries()].map(([type, ctor]) => ({ type, ctor }));
    }

    getEdgeTypeList(): Array<{ type: string; ctor: EdgeConstructor }> {
        return [...this.edgeTypes.entries()].map(([type, ctor]) => ({ type, ctor }));
    }

    // Check if a spec type exists (handles aliases)
    resolveNodeType(type: string): string {
        if (this.nodeTypes.has(type)) return type;
        // Try common aliases
        const aliases: Record<string, string> = {
            node: 'ShapeNode',
            shape: 'ShapeNode',
            edge: 'Edge',
            wire: 'Edge',
        };
        return aliases[type] ?? type;
    }

    createNode(sg: SpaceGraph, spec: NodeSpec): Node {
        if (!spec?.type) throw new Error('Node spec must include type');
        const type = this.resolveNodeType(spec.type);
        const ctor = this.getNodeConstructor(type);
        if (!ctor)
            throw new Error(
                `TypeRegistry: Unknown node type "${spec.type}". Registered: [${this.getNodeTypes().join(', ')}]`,
            );
        return new ctor(sg, spec);
    }

    createEdge(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node): Edge {
        if (!spec?.type) throw new Error('Edge spec must include type');
        const ctor = this.getEdgeConstructor(spec.type ?? 'Edge');
        if (!ctor)
            throw new Error(
                `TypeRegistry: Unknown edge type "${spec.type}". Registered: [${this.getEdgeTypes().join(', ')}]`,
            );
        return new ctor(sg, spec, source, target);
    }

    clear(): void {
        this.nodeTypes.clear();
        this.edgeTypes.clear();
    }

    // Snapshot/restore for testing
    snapshot(): { nodes: Map<string, NodeConstructor>; edges: Map<string, EdgeConstructor> } {
        return { nodes: new Map(this.nodeTypes), edges: new Map(this.edgeTypes) };
    }

    restore(snapshot: {
        nodes: Map<string, NodeConstructor>;
        edges: Map<string, EdgeConstructor>;
    }): void {
        this.nodeTypes.clear();
        this.edgeTypes.clear();
        for (const [type, ctor] of snapshot.nodes) this.nodeTypes.set(type, ctor);
        for (const [type, ctor] of snapshot.edges) this.edgeTypes.set(type, ctor);
    }

    #registerTypeAlias(ctor: NodeConstructor | EdgeConstructor, table: Map<string, any>): void {
        // Only alias a constructor's own `typeName`. Static fields are inherited, so a subclass
        // without its own (MermaidNode extends HtmlNode) must not replace its parent's registration.
        if (!Object.prototype.hasOwnProperty.call(ctor, 'typeName')) return;
        const typeName = (ctor as { typeName?: string }).typeName;
        if (typeof typeName === 'string') {
            table.set(typeName, ctor);
        }
    }
}
