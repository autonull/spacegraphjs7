import * as THREE from 'three';
import type { NodeSpec, NodeData } from './types';

type NodeEventMap = {
  'updated': { node: Node; changes: Partial<NodeSpec>; timestamp: number };
  'destroying': { node: Node; timestamp: number };
};

type NodeEventHandler<T extends keyof NodeEventMap> = (event: NodeEventMap[T]) => void;

export abstract class Node {
  readonly id: string;
  readonly type: string;
  public data: NodeData;
  public position: THREE.Vector3;
  public rotation: THREE.Vector3;
  public scale: THREE.Vector3;
  public label?: string;
  abstract readonly object: THREE.Object3D;

  private readonly eventHandlers = new Map<keyof NodeEventMap, Set<NodeEventHandler<any>>>();

  constructor(spec: NodeSpec) {
    this.id = spec.id;
    this.type = spec.type;
    this.label = spec.label;
    this.data = { ...spec.data };
    this.position = new THREE.Vector3(spec.position?.[0] ?? 0, spec.position?.[1] ?? 0, spec.position?.[2] ?? 0);
    this.rotation = new THREE.Vector3(spec.rotation?.[0] ?? 0, spec.rotation?.[1] ?? 0, spec.rotation?.[2] ?? 0);
    this.scale = new THREE.Vector3(spec.scale?.[0] ?? 1, spec.scale?.[1] ?? 1, spec.scale?.[2] ?? 1);
  }

  on<T extends keyof NodeEventMap>(event: T, handler: NodeEventHandler<T>): { dispose(): void } {
    const handlers = this.eventHandlers.get(event) ?? new Set();
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, handlers);
    handlers.add(handler);
    return { dispose: () => handlers.delete(handler) };
  }

  protected emit<T extends keyof NodeEventMap>(event: T, data: Omit<NodeEventMap[T], 'timestamp'>): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler({ ...data, timestamp: Date.now() } as NodeEventMap[T]);
      } catch (err) {
        console.error(`[Node ${this.id}] Event handler for ${event} failed:`, err);
      }
    });
  }

  update(spec: Partial<NodeSpec>): void {
    const changes: Partial<NodeSpec> = {};

    if (spec.label !== undefined && spec.label !== this.label) {
      this.label = spec.label;
      changes.label = spec.label;
    }

    if (spec.data !== undefined) {
      this.data = { ...this.data, ...spec.data };
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

  setPosition(x: number, y: number, z: number = 0): void {
    this.position.set(x, y, z);
    this.emit('updated', { node: this, changes: { position: [x, y, z] } });
  }

  applyPosition(target: THREE.Vector3, { animate = false, duration = 1.0 }: { animate?: boolean; duration?: number } = {}): void {
    if (animate && typeof window !== 'undefined' && 'gsap' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).gsap.to(this.position, {
        x: target.x, y: target.y, z: target.z,
        duration, ease: 'power2.out',
        onUpdate: () => this.object?.position.copy(this.position)
      });
    } else {
      this.position.copy(target);
      this.object?.position.copy(target);
    }
  }

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

  dispose(): void {
    this.emit('destroying', { node: this });
    this.object?.parent?.remove(this.object);
    this.eventHandlers.clear();
  }
}
