// SpaceGraphJS v7.0 - Node Base Class
// Abstract base class for all node types

import * as THREE from 'three';
import type { NodeSpec, NodeData } from './types';

export type NodeEventMap = {
  'updated': { node: Node; changes: Partial<NodeSpec>; timestamp: number };
  'destroying': { node: Node; timestamp: number };
};

export type NodeEventHandler<T extends keyof NodeEventMap> = (
  event: NodeEventMap[T]
) => void;

export abstract class Node {
  readonly id: string;
  readonly type: string;
  readonly data: Readonly<NodeData>;

  // Spatial state
  public position: THREE.Vector3;
  public rotation: THREE.Vector3;
  public scale: THREE.Vector3;

  // Optional label
  public label?: string;

  // Three.js object (must be implemented by concrete classes)
  abstract readonly object: THREE.Object3D;

  // Event handlers
  private eventHandlers: Map<keyof NodeEventMap, Set<NodeEventHandler<any>>> = new Map();

  constructor(spec: NodeSpec) {
    this.id = spec.id;
    this.type = spec.type;
    this.label = spec.label;
    this.data = Object.freeze({ ...spec.data });

    this.position = new THREE.Vector3(
      spec.position?.[0] ?? 0,
      spec.position?.[1] ?? 0,
      spec.position?.[2] ?? 0
    );

    this.rotation = new THREE.Vector3(
      spec.rotation?.[0] ?? 0,
      spec.rotation?.[1] ?? 0,
      spec.rotation?.[2] ?? 0
    );

    this.scale = new THREE.Vector3(
      spec.scale?.[0] ?? 1,
      spec.scale?.[1] ?? 1,
      spec.scale?.[2] ?? 1
    );
  }

  /**
   * Subscribe to node events
   */
  on<T extends keyof NodeEventMap>(event: T, handler: NodeEventHandler<T>): Disposable {
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
  protected emit<T extends keyof NodeEventMap>(event: T, data: Omit<NodeEventMap[T], 'timestamp'>): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    const timestamp = Date.now();
    const eventWithTime = { ...data, timestamp } as NodeEventMap[T];

    handlers.forEach(handler => {
      try {
        handler(eventWithTime);
      } catch (err) {
        console.error(`[Node ${this.id}] Event handler for ${event} failed:`, err);
      }
    });
  }

  /**
   * Update node data
   */
  update(spec: Partial<NodeSpec>): void {
    const changes: Partial<NodeSpec> = {};

    if (spec.label !== undefined && spec.label !== this.label) {
      this.label = spec.label;
      changes.label = spec.label;
    }

    if (spec.data !== undefined) {
      const oldData = this.data;
      const newData = { ...oldData, ...spec.data };
      Object.assign(this, { data: Object.freeze(newData) });
      changes.data = spec.data;
    }

    if (spec.position !== undefined) {
      this.position.fromArray(spec.position);
      changes.position = spec.position;
    }

    if (spec.rotation !== undefined) {
      this.rotation.fromArray(spec.rotation);
      changes.rotation = spec.rotation;
    }

    if (spec.scale !== undefined) {
      this.scale.fromArray(spec.scale);
      changes.scale = spec.scale;
    }

    if (Object.keys(changes).length > 0) {
      this.emit('updated', { node: this, changes });
    }
  }

  /**
   * Update position helper
   */
  setPosition(x: number, y: number, z: number = 0): void {
    this.position.set(x, y, z);
    this.emit('updated', { node: this, changes: { position: [x, y, z] } });
  }

  /**
   * Apply position with optional animation
   */
  applyPosition(
    target: THREE.Vector3,
    options: { animate?: boolean; duration?: number } = {}
  ): void {
    const { animate = false, duration = 1.0 } = options;

    if (animate && typeof window !== 'undefined' && 'gsap' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gsap = (window as any).gsap;
      gsap.to(this.position, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          if (this.object) {
            this.object.position.copy(this.position);
          }
        }
      });
    } else {
      this.position.copy(target);
      if (this.object) {
        this.object.position.copy(target);
      }
    }
  }

  /**
   * Convert to JSON spec
   */
  toJSON(): NodeSpec {
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      position: [this.position.x, this.position.y, this.position.z] as [number, number, number],
      rotation: [this.rotation.x, this.rotation.y, this.rotation.z] as [number, number, number],
      scale: [this.scale.x, this.scale.y, this.scale.z] as [number, number, number],
      data: { ...this.data }
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.emit('destroying', { node: this });

    if (this.object && this.object.parent) {
      this.object.parent.remove(this.object);
    }

    // Clear event handlers
    this.eventHandlers.clear();
  }
}
