import type { Plugin } from '../core/PluginManager';
import type { SpaceGraph } from '../SpaceGraph';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';

/**
 * Abstract base class for system plugins (non-layout).
 * Eliminates boilerplate: id/name/version, sg/graph/events storage,
 * and provides no-op hooks for optional lifecycle methods.
 */
export abstract class BaseSystemPlugin implements Plugin {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly version: string;

    protected sg!: SpaceGraph;
    protected graph!: Graph;
    protected events!: EventSystem;

    init(sg: SpaceGraph, graph: Graph, events: EventSystem): void | Promise<void> {
        this.sg = sg;
        this.graph = graph;
        this.events = events;
    }

    // Optional lifecycle hooks - override as needed
    onPreRender?(_delta: number): void {}
    onPostRender?(_delta: number): void {}
    onNodeAdded?(_node: Node): void {}
    onNodeRemoved?(_node: Node): void {}
    onEdgeAdded?(_edge: Edge): void {}
    onEdgeRemoved?(_edge: Edge): void {}
    dispose?(): void {}
    export?(): unknown {
        return undefined;
    }
    import?(_data: unknown): void {}
}
