// SpaceGraphJS - Layout Container with Dirty Flag
// Auto-triggers layout on graph mutations via dirty flag pattern

import type { Graph } from '../core/Graph';
import type { Node } from '../nodes/Node';
import type { EventSystem } from '../core/events/EventSystem';

export abstract class LayoutContainer {
    protected needsLayout = false;
    protected graph: Graph;
    protected events: EventSystem;

    constructor(graph: Graph, events: EventSystem) {
        this.graph = graph;
        this.events = events;
        graph.on('node:added', () => this.markDirty());
        graph.on('node:removed', () => this.markDirty());
    }

    markDirty(): void {
        this.needsLayout = true;
    }

    onPreRender(_dt: number): void {
        if (this.needsLayout) {
            this.needsLayout = false;
            this.doLayout(_dt);
        }
    }

    protected abstract doLayout(dt: number): void;
}
