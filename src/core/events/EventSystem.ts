// SpaceGraphJS v7.0 - Event System
// Type-safe event system with batching support

import mitt, { Emitter } from 'mitt';

/**
 * Core SpaceGraph events
 */
export interface SpaceGraphEvents {
  // Node events
  'node:added': { node: unknown; timestamp: number };
  'node:removed': { id: string; timestamp: number };
  'node:updated': { node: unknown; changes: Record<string, unknown>; timestamp: number };

  // Edge events
  'edge:added': { edge: unknown; timestamp: number };
  'edge:removed': { id: string; timestamp: number };
  'edge:updated': { edge: unknown; changes: Record<string, unknown>; timestamp: number };

  // Interaction events
  'interaction:dragstart': { node: unknown; event: PointerEvent };
  'interaction:dragend': { node: unknown; event: PointerEvent };
  'interaction:drag': { node: unknown; position: [number, number, number] };

  // Camera events
  'camera:move': { position: [number, number, number]; target: [number, number, number] };

  // Selection events
  'selection:changed': { nodes: string[]; edges: string[]; timestamp: number };

  // Click events
  'node:click': { node: unknown; event: MouseEvent };
  'graph:click': { event: MouseEvent };

  // Context menu events
  'node:contextmenu': { node: unknown; event: MouseEvent };
  'graph:contextmenu': { event: MouseEvent };

  // Vision events
  'vision:report': { report: unknown; timestamp: number };
  'vision:overlap:detected': { overlaps: Array<{ nodeA: string; nodeB: string }>; timestamp: number };

  // Layout events
  'layout:applied': { layout: string; duration: number; timestamp: number };

  // Plugin events
  'plugin:ready': { pluginId: string; timestamp: number };
  'plugin:error': { pluginId: string; error: Error; timestamp: number };

  // Allow additional custom events
  [key: string]: unknown;
}

/**
 * Event system with type-safe subscriptions and batching
 */
export class EventSystem {
  private emitter: Emitter<SpaceGraphEvents>;
  private batchedEvents: Map<keyof SpaceGraphEvents, unknown[]> = new Map();
  private batchFrameId: number | null = null;

  constructor() {
    this.emitter = mitt<SpaceGraphEvents>();
  }

  /**
   * Subscribe to an event
   */
  on<K extends keyof SpaceGraphEvents>(
    type: K,
    handler: (event: SpaceGraphEvents[K]) => void
  ): { dispose(): void } {
    this.emitter.on(type, handler);
    return {
      dispose: () => {
        this.emitter.off(type, handler);
      }
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof SpaceGraphEvents>(
    type: K,
    handler?: (event: SpaceGraphEvents[K]) => void
  ): void {
    this.emitter.off(type, handler);
  }

  /**
   * Emit an event immediately
   */
  emit<K extends keyof SpaceGraphEvents>(type: K, event: SpaceGraphEvents[K]): void {
    this.emitter.emit(type, event);
  }

  /**
   * Emit an event batched to the next animation frame
   * Useful for high-frequency events like drag or camera moves
   */
  emitBatched<K extends keyof SpaceGraphEvents>(type: K, event: SpaceGraphEvents[K]): void {
    if (!this.batchedEvents.has(type)) {
      this.batchedEvents.set(type, []);
    }
    this.batchedEvents.get(type)!.push(event);

    if (this.batchFrameId !== null) return;

    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      this.batchFrameId = requestAnimationFrame(() => this.flushBatch());
    } else {
      // Node.js environment - flush immediately
      this.flushBatch();
    }
  }

  /**
   * Flush all batched events
   */
  private flushBatch(): void {
    this.batchFrameId = null;

    for (const [type, events] of this.batchedEvents.entries()) {
      for (const event of events) {
        this.emitter.emit(type, event as SpaceGraphEvents[typeof type]);
      }
    }

    this.batchedEvents.clear();
  }

  /**
   * Clear all event listeners and batches
   */
  clear(): void {
    if (this.batchFrameId !== null) {
      cancelAnimationFrame(this.batchFrameId);
      this.batchFrameId = null;
    }
    this.batchedEvents.clear();
    this.emitter.all.clear();
  }

  /**
   * Get listener count for an event type
   */
  listenerCount<K extends keyof SpaceGraphEvents>(type: K): number {
    const handlers = this.emitter.all.get(type);
    return handlers?.size ?? 0;
  }
}

/**
 * Plugin event bus for plugin-to-plugin communication
 */
export interface PluginEvent {
  type: string;
  timestamp: number;
}

export interface VisionReportEvent extends PluginEvent {
  type: 'vision:report';
  report: unknown;
}

export interface LayoutAppliedEvent extends PluginEvent {
  type: 'layout:applied';
  layout: string;
  duration: number;
}

export interface OverlapDetectedEvent extends PluginEvent {
  type: 'vision:overlap:detected';
  overlaps: Array<{ nodeA: string; nodeB: string }>;
}

export interface NodeDragEvent extends PluginEvent {
  type: 'node:drag';
  nodeId: string;
  position: [number, number, number];
}

export interface SelectionChangedEvent extends PluginEvent {
  type: 'selection:changed';
  nodes: string[];
  edges: string[];
}

export type AnyPluginEvent =
  | VisionReportEvent
  | LayoutAppliedEvent
  | OverlapDetectedEvent
  | NodeDragEvent
  | SelectionChangedEvent;

/**
 * Plugin event bus for inter-plugin communication
 */
export class PluginEventBus {
  private handlers: Map<string, Set<(event: AnyPluginEvent) => void>> = new Map();

  /**
   * Subscribe to a plugin event
   */
  subscribe<T extends AnyPluginEvent>(
    type: T['type'],
    handler: (event: T) => void
  ): { dispose(): void } {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as (event: AnyPluginEvent) => void);

    return {
      dispose: () => {
        this.handlers.get(type)?.delete(handler as (event: AnyPluginEvent) => void);
      }
    };
  }

  /**
   * Publish an event to all subscribers
   */
  publish<T extends AnyPluginEvent>(event: T): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    const eventWithTime = { ...event, timestamp: Date.now() };
    handlers.forEach(handler => {
      try {
        handler(eventWithTime);
      } catch (err) {
        console.error(`[PluginEventBus] Handler for ${event.type} failed:`, err);
      }
    });
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}
