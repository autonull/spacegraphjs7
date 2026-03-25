import mitt, { Emitter } from 'mitt';

export interface SpaceGraphEvents {
  'node:added': { node: unknown; timestamp: number };
  'node:removed': { id: string; timestamp: number };
  'node:updated': { node: unknown; changes: Record<string, unknown>; timestamp: number };
  'edge:added': { edge: unknown; timestamp: number };
  'edge:removed': { id: string; timestamp: number };
  'edge:updated': { edge: unknown; changes: Record<string, unknown>; timestamp: number };
  'interaction:dragstart': { node: unknown; event: PointerEvent };
  'interaction:dragend': { node: unknown; event: PointerEvent };
  'interaction:drag': { node: unknown; position: [number, number, number] };
  'camera:move': { position: [number, number, number]; target: [number, number, number] };
  'selection:changed': { nodes: string[]; edges: string[]; timestamp: number };
  'node:click': { node: unknown; event: MouseEvent };
  'graph:click': { event: MouseEvent };
  'node:contextmenu': { node: unknown; event: MouseEvent };
  'graph:contextmenu': { event: MouseEvent };
  'vision:report': { report: unknown; timestamp: number };
  'vision:overlap:detected': { overlaps: Array<{ nodeA: string; nodeB: string }>; timestamp: number };
  'layout:applied': { layout: string; duration: number; timestamp: number };
  'plugin:ready': { pluginId: string; timestamp: number };
  'plugin:error': { pluginId: string; error: Error; timestamp: number };
  [key: string]: unknown;
}

export class EventSystem {
  private readonly emitter = mitt<SpaceGraphEvents>();
  private readonly batchedEvents = new Map<keyof SpaceGraphEvents, unknown[]>();
  private batchFrameId: number | null = null;

  on<K extends keyof SpaceGraphEvents>(type: K, handler: (event: SpaceGraphEvents[K]) => void): { dispose(): void } {
    this.emitter.on(type, handler);
    return { dispose: () => this.emitter.off(type, handler) };
  }

  off<K extends keyof SpaceGraphEvents>(type: K, handler?: (event: SpaceGraphEvents[K]) => void): void {
    this.emitter.off(type, handler);
  }

  emit<K extends keyof SpaceGraphEvents>(type: K, event: SpaceGraphEvents[K]): void {
    this.emitter.emit(type, event);
  }

  emitBatched<K extends keyof SpaceGraphEvents>(type: K, event: SpaceGraphEvents[K]): void {
    const events = this.batchedEvents.get(type) ?? [];
    if (!this.batchedEvents.has(type)) this.batchedEvents.set(type, events);
    events.push(event);
    if (this.batchFrameId === null) {
      this.batchFrameId = typeof window !== 'undefined' && 'requestAnimationFrame' in window
        ? requestAnimationFrame(() => this.flushBatch())
        : setTimeout(() => this.flushBatch(), 0);
    }
  }

  private flushBatch(): void {
    this.batchFrameId = null;
    for (const [type, events] of this.batchedEvents) {
      for (const event of events) this.emitter.emit(type, event as SpaceGraphEvents[typeof type]);
    }
    this.batchedEvents.clear();
  }

  clear(): void {
    if (this.batchFrameId !== null) {
      cancelAnimationFrame(this.batchFrameId);
      this.batchFrameId = null;
    }
    this.batchedEvents.clear();
    this.emitter.all.clear();
  }

  listenerCount<K extends keyof SpaceGraphEvents>(type: K): number {
    return this.emitter.all.get(type)?.size ?? 0;
  }
}

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

export class PluginEventBus {
  private readonly handlers = new Map<string, Set<(event: AnyPluginEvent) => void>>();

  subscribe<T extends AnyPluginEvent>(type: T['type'], handler: (event: T) => void): { dispose(): void } {
    const handlers = this.handlers.get(type) ?? new Set();
    if (!this.handlers.has(type)) this.handlers.set(type, handlers);
    handlers.add(handler as (event: AnyPluginEvent) => void);
    return { dispose: () => handlers.delete(handler as (event: AnyPluginEvent) => void) };
  }

  publish<T extends AnyPluginEvent>(event: T): void {
    this.handlers.get(event.type)?.forEach(handler => {
      try {
        handler({ ...event, timestamp: Date.now() });
      } catch (err) {
        console.error(`[PluginEventBus] Handler for ${event.type} failed:`, err);
      }
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}
