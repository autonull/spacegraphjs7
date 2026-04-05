// SpaceGraphJS - PortNode
// Typed connectable data ports for visual programming

import { ShapeNode } from './ShapeNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import type { Wire } from '../edges/Wire';

export class PortNode<T = unknown> extends ShapeNode {
    private connections: Wire<T>[] = [];
    private onReceive: ((wire: Wire<T>, data: T) => void) | null = null;

    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg!, spec!);
        if (this.object) {
            this.object.userData.portNode = this;
        }
    }

    listen(callback: (wire: Wire<T>, data: T) => void): this {
        this.onReceive = callback;
        return this;
    }

    out(data: T): void {
        for (const wire of this.connections) {
            wire.send(data);
        }
    }

    connect(target: PortNode<T>): Wire<T> {
        const WireCtor = (globalThis as any).__SG_Wire;
        if (!WireCtor) throw new Error('Wire constructor not registered');
        const wire = new WireCtor(this, target);
        this.connections.push(wire);
        return wire;
    }

    disconnect(wire: Wire<T>): void {
        const idx = this.connections.indexOf(wire);
        if (idx >= 0) this.connections.splice(idx, 1);
    }

    getConnections(): ReadonlyArray<Wire<T>> {
        return this.connections;
    }

    getReceiveHandler(): ((wire: Wire<T>, data: T) => void) | null {
        return this.onReceive;
    }

    dispose(): void {
        for (const wire of this.connections) {
            wire.dispose();
        }
        this.connections = [];
        super.dispose();
    }
}
