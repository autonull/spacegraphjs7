import * as THREE from 'three';
import type { EdgeSpec, EdgeData } from './types';
import type { Node } from './Node';

type EdgeEventMap = {
  'updated': { edge: Edge; changes: Partial<EdgeSpec>; timestamp: number };
  'destroying': { edge: Edge; timestamp: number };
};

type EdgeEventHandler<T extends keyof EdgeEventMap> = (event: EdgeEventMap[T]) => void;

export abstract class Edge {
  readonly id: string;
  readonly type: string;
  public data: EdgeData;
  public source: Node;
  public target: Node;
  abstract readonly object: THREE.Object3D;

  private readonly eventHandlers = new Map<keyof EdgeEventMap, Set<EdgeEventHandler<any>>>();

  constructor(spec: EdgeSpec, source: Node, target: Node) {
    this.id = spec.id;
    this.type = spec.type;
    this.source = source;
    this.target = target;
    this.data = { ...spec.data };
  }

  on<T extends keyof EdgeEventMap>(event: T, handler: EdgeEventHandler<T>): { dispose(): void } {
    const handlers = this.eventHandlers.get(event) ?? new Set();
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, handlers);
    handlers.add(handler);
    return { dispose: () => handlers.delete(handler) };
  }

  protected emit<T extends keyof EdgeEventMap>(event: T, data: Omit<EdgeEventMap[T], 'timestamp'>): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler({ ...data, timestamp: Date.now() } as EdgeEventMap[T]);
      } catch (err) {
        console.error(`[Edge ${this.id}] Event handler for ${event} failed:`, err);
      }
    });
  }

  update(spec: Partial<EdgeSpec>): void {
    const changes: Partial<EdgeSpec> = {};
    if (spec.data !== undefined) {
      this.data = { ...this.data, ...spec.data };
      changes.data = spec.data;
    }
    if (spec.source !== undefined || spec.target !== undefined) {
      console.warn('[Edge] Topology changes (source/target) require explicit handling.');
    }
    if (Object.keys(changes).length > 0) {
      this.emit('updated', { edge: this, changes });
    }
  }

  abstract updatePositions(): void;

  toJSON(): EdgeSpec {
    return {
      id: this.id,
      source: this.source.id,
      target: this.target.id,
      type: this.type,
      data: { ...this.data }
    };
  }

  dispose(): void {
    this.emit('destroying', { edge: this });
    this.object?.parent?.remove(this.object);
    this.eventHandlers.clear();
  }
}
