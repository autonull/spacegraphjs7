// SpaceGraphJS v7.0 - Node/Edge Type Registry
// Maps type names to constructors for dynamic instantiation

import type { Node } from '../graph/Node';
import type { Edge } from '../graph/Edge';
import type { NodeSpec, EdgeSpec } from '../graph/types';

/**
 * Node constructor type
 */
export type NodeConstructor = new (spec: NodeSpec) => Node;

/**
 * Edge constructor type
 */
export type EdgeConstructor = new (spec: EdgeSpec, source: Node, target: Node) => Edge;

/**
 * Node and Edge type registry
 * Maps type names to their constructors
 */
export class TypeRegistry {
  private static instance: TypeRegistry;

  private nodeTypes: Map<string, NodeConstructor> = new Map();
  private edgeTypes: Map<string, EdgeConstructor> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TypeRegistry {
    if (!TypeRegistry.instance) {
      TypeRegistry.instance = new TypeRegistry();
    }
    return TypeRegistry.instance;
  }

  /**
   * Register a node type
   */
  registerNode(typeName: string, constructor: NodeConstructor): void {
    if (this.nodeTypes.has(typeName)) {
      console.warn(`[TypeRegistry] Node type "${typeName}" already registered. Overwriting.`);
    }
    this.nodeTypes.set(typeName, constructor);
  }

  /**
   * Register an edge type
   */
  registerEdge(typeName: string, constructor: EdgeConstructor): void {
    if (this.edgeTypes.has(typeName)) {
      console.warn(`[TypeRegistry] Edge type "${typeName}" already registered. Overwriting.`);
    }
    this.edgeTypes.set(typeName, constructor);
  }

  /**
   * Get a node constructor by type name
   */
  getNodeConstructor(typeName: string): NodeConstructor | undefined {
    return this.nodeTypes.get(typeName);
  }

  /**
   * Get an edge constructor by type name
   */
  getEdgeConstructor(typeName: string): EdgeConstructor | undefined {
    return this.edgeTypes.get(typeName);
  }

  /**
   * Check if a node type is registered
   */
  hasNode(typeName: string): boolean {
    return this.nodeTypes.has(typeName);
  }

  /**
   * Check if an edge type is registered
   */
  hasEdge(typeName: string): boolean {
    return this.edgeTypes.has(typeName);
  }

  /**
   * Get all registered node type names
   */
  getNodeTypes(): string[] {
    return Array.from(this.nodeTypes.keys());
  }

  /**
   * Get all registered edge type names
   */
  getEdgeTypes(): string[] {
    return Array.from(this.edgeTypes.keys());
  }

  /**
   * Create a node from spec
   */
  createNode(spec: NodeSpec): Node {
    const constructor = this.getNodeConstructor(spec.type);
    if (!constructor) {
      throw new Error(`Unknown node type: ${spec.type}. Registered types: ${this.getNodeTypes().join(', ')}`);
    }
    return new constructor(spec);
  }

  /**
   * Create an edge from spec
   */
  createEdge(spec: EdgeSpec, source: Node, target: Node): Edge {
    const constructor = this.getEdgeConstructor(spec.type);
    if (!constructor) {
      throw new Error(`Unknown edge type: ${spec.type}. Registered types: ${this.getEdgeTypes().join(', ')}`);
    }
    return new constructor(spec, source, target);
  }

  /**
   * Clear all registered types
   */
  clear(): void {
    this.nodeTypes.clear();
    this.edgeTypes.clear();
  }
}

/**
 * Convenience function to register a node type
 */
export function registerNode(typeName: string, constructor: NodeConstructor): void {
  TypeRegistry.getInstance().registerNode(typeName, constructor);
}

/**
 * Convenience function to register an edge type
 */
export function registerEdge(typeName: string, constructor: EdgeConstructor): void {
  TypeRegistry.getInstance().registerEdge(typeName, constructor);
}
