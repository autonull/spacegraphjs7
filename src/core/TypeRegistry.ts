import type { Node } from '../graph/Node';
import type { Edge } from '../graph/Edge';
import type { NodeSpec, EdgeSpec } from '../graph/types';

export type NodeConstructor = new (spec: NodeSpec) => Node;
export type EdgeConstructor = new (spec: EdgeSpec, source: Node, target: Node) => Edge;

export class TypeRegistry {
  private static instance: TypeRegistry;
  private readonly nodeTypes = new Map<string, NodeConstructor>();
  private readonly edgeTypes = new Map<string, EdgeConstructor>();

  private constructor() {}

  static getInstance(): TypeRegistry {
    return TypeRegistry.instance ?? (TypeRegistry.instance = new TypeRegistry());
  }

  registerNode(typeName: string, constructor: NodeConstructor): void {
    if (this.nodeTypes.has(typeName)) {
      console.warn(`[TypeRegistry] Node type "${typeName}" already registered. Overwriting.`);
    }
    this.nodeTypes.set(typeName, constructor);
  }

  registerEdge(typeName: string, constructor: EdgeConstructor): void {
    if (this.edgeTypes.has(typeName)) {
      console.warn(`[TypeRegistry] Edge type "${typeName}" already registered. Overwriting.`);
    }
    this.edgeTypes.set(typeName, constructor);
  }

  getNodeConstructor(typeName: string): NodeConstructor | undefined {
    return this.nodeTypes.get(typeName);
  }

  getEdgeConstructor(typeName: string): EdgeConstructor | undefined {
    return this.edgeTypes.get(typeName);
  }

  hasNode(typeName: string): boolean {
    return this.nodeTypes.has(typeName);
  }

  hasEdge(typeName: string): boolean {
    return this.edgeTypes.has(typeName);
  }

  getNodeTypes(): string[] {
    return Array.from(this.nodeTypes.keys());
  }

  getEdgeTypes(): string[] {
    return Array.from(this.edgeTypes.keys());
  }

  createNode(spec: NodeSpec): Node {
    const constructor = this.getNodeConstructor(spec.type);
    if (!constructor) {
      throw new Error(`Unknown node type: ${spec.type}. Registered: ${this.getNodeTypes().join(', ')}`);
    }
    return new constructor(spec);
  }

  createEdge(spec: EdgeSpec, source: Node, target: Node): Edge {
    const constructor = this.getEdgeConstructor(spec.type);
    if (!constructor) {
      throw new Error(`Unknown edge type: ${spec.type}. Registered: ${this.getEdgeTypes().join(', ')}`);
    }
    return new constructor(spec, source, target);
  }

  clear(): void {
    this.nodeTypes.clear();
    this.edgeTypes.clear();
  }
}

export function registerNode(typeName: string, constructor: NodeConstructor): void {
  TypeRegistry.getInstance().registerNode(typeName, constructor);
}

export function registerEdge(typeName: string, constructor: EdgeConstructor): void {
  TypeRegistry.getInstance().registerEdge(typeName, constructor);
}
