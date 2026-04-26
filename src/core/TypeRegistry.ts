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

  static getInstance(): TypeRegistry {
    return TypeRegistry.instance ??= new TypeRegistry();
  }

  registerNode(type: string, ctor: NodeConstructor): this {
    if (!this.nodeTypes.has(type)) this.nodeTypes.set(type, ctor);
    return this;
  }

  registerEdge(type: string, ctor: EdgeConstructor): this {
    if (!this.edgeTypes.has(type)) this.edgeTypes.set(type, ctor);
    return this;
  }

  getNodeConstructor(type: string): NodeConstructor | undefined {
    return this.nodeTypes.get(type);
  }

  getEdgeConstructor(type: string): EdgeConstructor | undefined {
    return this.edgeTypes.get(type);
  }

  hasNode(type: string): boolean { return this.nodeTypes.has(type); }
  hasEdge(type: string): boolean { return this.edgeTypes.has(type); }
  getNodeTypes(): string[] { return [...this.nodeTypes.keys()]; }
  getEdgeTypes(): string[] { return [...this.edgeTypes.keys()]; }

  registerNodeType(name: string, ctor: NodeConstructor): void {
    this.registerNode(name, ctor);
  }

  registerEdgeType(name: string, ctor: EdgeConstructor): void {
    this.registerEdge(name, ctor);
  }

  createNode(sgOrSpec: SpaceGraph | NodeSpec, specOrSg?: NodeSpec | SpaceGraph): Node {
    const isSpecFirst = 'type' in sgOrSpec;
    const nodeSpec = isSpecFirst ? (sgOrSpec as NodeSpec) : (specOrSg as NodeSpec);
    const sg = isSpecFirst ? (specOrSg as SpaceGraph) : (sgOrSpec as SpaceGraph);

    if (!nodeSpec?.type) throw new Error('Node spec must include type');
    const ctor = this.getNodeConstructor(nodeSpec.type);
    if (!ctor) throw new Error(`TypeRegistry: Unknown node type "${nodeSpec.type}". Registered: [${this.getNodeTypes().join(', ')}]`);
    return new ctor(sg, nodeSpec);
  }

  createEdge(sgOrSpec: SpaceGraph | EdgeSpec, specOrSource: EdgeSpec | Node, sourceOrTarget?: Node, targetOrNothing?: Node): Edge {
    const isSpecFirst = 'source' in (sgOrSpec as any);
    const edgeSpec = isSpecFirst ? (sgOrSpec as EdgeSpec) : (specOrSource as EdgeSpec);
    const sg = isSpecFirst ? (sourceOrTarget as SpaceGraph) : (sgOrSpec as SpaceGraph);
    const source = isSpecFirst ? (specOrSource as Node) : (sourceOrTarget as Node);
    const target = isSpecFirst ? (sourceOrTarget as Node) : (targetOrNothing as Node);

    if (!edgeSpec?.type) throw new Error('Edge spec must include type');
    const ctor = this.getEdgeConstructor(edgeSpec.type ?? 'Edge');
    if (!ctor) throw new Error(`TypeRegistry: Unknown edge type "${edgeSpec.type}". Registered: [${this.getEdgeTypes().join(', ')}]`);
    return new ctor(sg, edgeSpec, source, target);
  }

  clear(): void {
    this.nodeTypes.clear();
    this.edgeTypes.clear();
  }
}

export const registerNode = (type: string, ctor: NodeConstructor) => TypeRegistry.getInstance().registerNode(type, ctor);
export const registerEdge = (type: string, ctor: EdgeConstructor) => TypeRegistry.getInstance().registerEdge(type, ctor);
