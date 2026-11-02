// Plugin system types

import type { Edge } from '../edges/Edge';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { Graph } from '../core/Graph';
import type { EventEmitter } from '../core/EventEmitter';

export interface PluginLifecycle {
    init?(sg: SpaceGraph, graph: Graph, events: EventEmitter): void | Promise<void>;

    onPreRender?(delta: number): void;

    onPostRender?(delta: number): void;

    onNodeAdded?(node: Node): void;

    onNodeRemoved?(node: Node): void;

    onEdgeAdded?(edge: Edge): void;

    onEdgeRemoved?(edge: Edge): void;

    dispose?(): void;

    export?(): unknown;

    import?(data: unknown): void;
}

export interface Plugin extends PluginLifecycle {
    readonly id: string;
    readonly name: string;
    readonly version: string;
}

// ============= Constructor Types =============
export type NodeConstructor = new (
    sg: SpaceGraph | undefined,
    spec: import('./spec').NodeSpec,
) => Node;
export type EdgeConstructor = new (
    sg: SpaceGraph | undefined,
    spec: import('./spec').EdgeSpec,
    source: Node,
    target: Node,
) => Edge;
