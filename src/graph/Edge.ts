// SpaceGraphJS v7.0 - Edge Base Class
// Abstract base class for all edge types

import * as THREE from 'three';
import type { EdgeSpec, EdgeData } from './types';
import type { Node } from './Node';

export type EdgeEventMap = {
  'updated': { edge: Edge; changes: Partial<EdgeSpec>; timestamp: number };
  'destroying': { edge: Edge; timestamp: number };
};

export type EdgeEventHandler<T extends keyof EdgeEventMap> = (
  event: EdgeEventMap[T]
) => void;

export abstract class Edge {
  readonly id: string;
  readonly type: string;
  
  // Mutable data
  public data: EdgeData;

  // Topology (references to nodes)
  public source: Node;
  public target: Node;

  // Three.js object (must be implemented by concrete classes)
  abstract readonly object: THREE.Object3D;

  // Event handlers
  private eventHandlers: Map<keyof EdgeEventMap, Set<EdgeEventHandler<any>>> = new Map();

  constructor(spec: EdgeSpec, source: Node, target: Node) {
    this.id = spec.id;
    this.type = spec.type;
    this.source = source;
    this.target = target;
    this.data = { ...spec.data };
  }

  /**
   * Subscribe to edge events
   */
  on<T extends keyof EdgeEventMap>(event: T, handler: EdgeEventHandler<T>): { dispose(): void } {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    return {
      dispose: () => {
        this.eventHandlers.get(event)?.delete(handler);
      }
    };
  }

  /**
   * Emit an event to all registered handlers
   */
  protected emit<T extends keyof EdgeEventMap>(event: T, data: Omit<EdgeEventMap[T], 'timestamp'>): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    const timestamp = Date.now();
    const eventWithTime = { ...data, timestamp } as EdgeEventMap[T];

    handlers.forEach(handler => {
      try {
        handler(eventWithTime);
      } catch (err) {
        console.error(`[Edge ${this.id}] Event handler for ${event} failed:`, err);
      }
    });
  }

  /**
   * Update edge data
   */
  update(spec: Partial<EdgeSpec>): void {
    const changes: Partial<EdgeSpec> = {};

    if (spec.data !== undefined) {
      const oldData = this.data;
      const newData = { ...oldData, ...spec.data };
      Object.assign(this, { data: Object.freeze(newData) });
      changes.data = spec.data;
    }

    if (spec.source !== undefined || spec.target !== undefined) {
      // Topology changes require special handling
      console.warn('[Edge] Topology changes (source/target) require explicit handling.');
    }

    if (Object.keys(changes).length > 0) {
      this.emit('updated', { edge: this, changes });
    }
  }

  /**
   * Update edge positions based on source and target nodes
   * Must be implemented by concrete classes
   */
  abstract updatePositions(): void;

  /**
   * Convert to JSON spec
   */
  toJSON(): EdgeSpec {
    return {
      id: this.id,
      source: this.source.id,
      target: this.target.id,
      type: this.type,
      data: { ...this.data }
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.emit('destroying', { edge: this });

    if (this.object && this.object.parent) {
      this.object.parent.remove(this.object);
    }

    // Clear event handlers
    this.eventHandlers.clear();
  }
}
