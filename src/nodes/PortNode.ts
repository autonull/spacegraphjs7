// SpaceGraphJS - PortNode
// Typed connectable data ports for visual programming

import { ShapeNode } from './ShapeNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import type { Wire } from '../edges/Wire';

export type PortType = 'bool' | 'int' | 'float' | 'string' | 'vector2' | 'vector3' | 'color' | 'any';
export type PortDirection = 'input' | 'output';

export interface PortTypeInfo {
    type: PortType;
    direction: PortDirection;
    label?: string;
    defaultValue?: unknown;
}

const PORT_COLORS: Record<PortType, number> = {
    bool: 0xff6b6b,
    int: 0x4ecdc4,
    float: 0x45b7d9,
    string: 0x96ceb4,
    vector2: 0xffeaa7,
    vector3: 0xdfe6e9,
    color: 0xa29bfe,
    any: 0xb2bec3,
};

export class PortNode<T = unknown> extends ShapeNode {
    private connections: Wire<T>[] = [];
    private onReceive: ((wire: Wire<T>, data: T) => void) | null = null;
    private portType: PortType = 'any';
    private portDirection: PortDirection = 'output';
    private label: string = '';

    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg!, spec!);
        if (this.object) {
            this.object.userData.portNode = this;
        }
        
        const data = spec?.data as Record<string, unknown> | undefined;
        this.portType = (data?.portType as PortType) ?? 'any';
        this.portDirection = (data?.portDirection as PortDirection) ?? 'output';
        this.label = (data?.label as string) ?? '';
        
        this._updateAppearance();
    }

    private _updateAppearance(): void {
        const color = PORT_COLORS[this.portType];
        if (this.material) {
            this.material.color.setHex(color);
        }
    }

    getPortType(): PortType {
        return this.portType;
    }

    getPortDirection(): PortDirection {
        return this.portDirection;
    }

    setPortType(type: PortType): void {
        this.portType = type;
        this._updateAppearance();
    }

    setPortDirection(direction: PortDirection): void {
        this.portDirection = direction;
        this._updateAppearance();
    }

    canConnectTo(target: PortNode<unknown>): boolean {
        if (this.portDirection === target.getPortDirection()) {
            return false;
        }
        if (this.portType !== 'any' && target.portType !== 'any' && this.portType !== target.portType) {
            return false;
        }
        return true;
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
        
        if (!this.canConnectTo(target)) {
            throw new Error(`Cannot connect: incompatible port types (${this.portType} -> ${target.portType})`);
        }
        
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
