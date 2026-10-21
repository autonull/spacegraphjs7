// SpaceGraphJS - PortNode
// Typed connectable data ports for visual programming

import type { Wire } from '../edges/Wire';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { ShapeNode } from './ShapeNode';

export type PortType =
  | 'bool'
  | 'int'
  | 'float'
  | 'string'
  | 'vector2'
  | 'vector3'
  | 'color'
  | 'any';
export type PortDirection = 'input' | 'output';

export class PortNode<T = unknown> extends ShapeNode {
  static readonly typeName: string = 'PortNode';
  private connections: Wire<T>[] = [];
  private onReceive: ((wire: Wire<T>, data: T) => void) | null = null;
  private portType: PortType = 'any';
  private portDirection: PortDirection = 'output';

  constructor(sg?: SpaceGraph, spec?: NodeSpec) {
    super(sg!, spec!);
    if (this.object) {
      this.object.userData.portNode = this;
    }

    const data = spec?.data as Record<string, unknown> | undefined;
    this.portType = (data?.portType as PortType) ?? 'any';
    this.portDirection = (data?.portDirection as PortDirection) ?? 'output';
  }

  getPortType(): PortType {
    return this.portType;
  }

  getPortDirection(): PortDirection {
    return this.portDirection;
  }

  setPortType(type: PortType): void {
    this.portType = type;
  }

  setPortDirection(direction: PortDirection): void {
    this.portDirection = direction;
  }

  canConnectTo(target: PortNode<any>): boolean {
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
      throw new Error(
        `Cannot connect: incompatible port types (${this.portType} -> ${target.portType})`
      );
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
